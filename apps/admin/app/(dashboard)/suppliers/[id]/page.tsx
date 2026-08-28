import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DatePicker, Input, ModalTrigger, PageHeader, Breadcrumb, Select, cn } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { getProductCatalogForSupplier } from "../../../../lib/get-product-catalog";
import { getAttachmentSignedUrl } from "../../../../lib/get-attachment-url";
import { updateSupplierAction } from "../actions";
import { createProductAction, updateProductAction } from "../../products/actions";
import { PurchaseForm } from "../../purchases/purchase-form";
import { RecordInvoicePaymentForm } from "../../purchases/record-payment-form";

const ATTACHMENTS_BUCKET = "purchase-invoice-attachments";

type SupplierDetail = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  commercial_registration_number: string | null;
  vat_number: string | null;
};

type PurchaseInvoiceRow = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  total_amount: number;
  payment_status: string;
  attachment_path: string | null;
};

type SupplierPaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  purchase_invoice_id: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  visible_in_store: boolean;
  is_active: boolean;
  has_expiry: boolean;
  expiry_date: string | null;
  category_id: string | null;
  base_unit_id: string;
};

type Category = { id: string; name: string };
type Unit = { id: string; name: string };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  check: "شيك",
  transfer: "تحويل بنكي",
};

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: "الكل", value: undefined },
  { label: "مدفوعة", value: "paid" },
  { label: "جزئي", value: "partial" },
  { label: "غير مدفوعة", value: "unpaid" },
];

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string };
}) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_purchases");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select<
      "id, name, phone, address, notes, commercial_registration_number, vat_number",
      SupplierDetail
    >("id, name, phone, address, notes, commercial_registration_number, vat_number")
    .eq("id", params.id)
    .single();

  if (!supplier) notFound();

  const [
    { data: allPurchaseInvoices },
    { data: payments },
    { data: supplierProducts },
    { data: categories },
    { data: units },
    { data: stock },
    catalog,
  ] = await Promise.all([
    supabase
      .from("purchase_invoices")
      .select<
        "id, invoice_number, invoice_date, total_amount, payment_status, attachment_path",
        PurchaseInvoiceRow
      >("id, invoice_number, invoice_date, total_amount, payment_status, attachment_path")
      .eq("supplier_id", supplier.id)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select<"id, payment_date, amount, method, purchase_invoice_id", SupplierPaymentRow>(
        "id, payment_date, amount, method, purchase_invoice_id",
      )
      .eq("supplier_id", supplier.id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("products")
      .select<
        "id, name, description, price, image_url, visible_in_store, is_active, has_expiry, expiry_date, category_id, base_unit_id",
        ProductRow
      >(
        "id, name, description, price, image_url, visible_in_store, is_active, has_expiry, expiry_date, category_id, base_unit_id",
      )
      .eq("supplier_id", supplier.id)
      .order("name"),
    supabase.from("categories").select<"id, name", Category>("id, name").order("name"),
    supabase.from("units").select<"id, name", Unit>("id, name").order("name"),
    supabase
      .from("warehouse_stock")
      .select<"product_id, quantity_available", { product_id: string; quantity_available: number }>(
        "product_id, quantity_available",
      ),
    getProductCatalogForSupplier(supplier.id),
  ]);

  const catalogBySupplier = { [supplier.id]: catalog };
  const quantityByProductId = new Map((stock ?? []).map((s) => [s.product_id, s.quantity_available]));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }
  const invoiceNumberById = new Map((allPurchaseInvoices ?? []).map((inv) => [inv.id, inv.invoice_number]));

  const totalOwed = (allPurchaseInvoices ?? [])
    .filter((inv) => inv.payment_status === "unpaid" || inv.payment_status === "partial")
    .reduce((sum, inv) => sum + (inv.total_amount - (paidByInvoice.get(inv.id) ?? 0)), 0);

  const purchaseInvoices = searchParams.status
    ? (allPurchaseInvoices ?? []).filter((inv) => inv.payment_status === searchParams.status)
    : (allPurchaseInvoices ?? []);

  const attachmentUrls = await Promise.all(
    purchaseInvoices.map((inv) => getAttachmentSignedUrl(supabase, ATTACHMENTS_BUCKET, inv.attachment_path)),
  );
  const attachmentUrlByInvoiceId = new Map(purchaseInvoices.map((inv, i) => [inv.id, attachmentUrls[i] ?? null]));

  const canCreatePurchase = (units?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين", supplier.name]} />}
        title={supplier.name}
        subtitle="كشف حساب المورد: بياناته، منتجاته، فواتير الشراء، والمستحق"
        actions={
          canManage ? (
            <ModalTrigger label="+ فاتورة شراء" title={`فاتورة شراء — ${supplier.name}`} size="lg">
              {canCreatePurchase ? (
                <PurchaseForm
                  suppliers={[{ id: supplier.id, name: supplier.name }]}
                  catalogBySupplier={catalogBySupplier}
                  categories={categories ?? []}
                  units={units ?? []}
                />
              ) : (
                <p className="text-sm text-foreground/60">أضف وحدة قياس واحدة على الأقل أولًا لتتمكن من تسجيل فاتورة شراء</p>
              )}
            </ModalTrigger>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">بيانات المورد</h2>
            {canManage ? (
              <ModalTrigger label="تعديل" title={`تعديل: ${supplier.name}`} variant="outline" buttonSize="sm">
                <ActionForm action={updateSupplierAction} className="space-y-3">
                  <input type="hidden" name="id" value={supplier.id} />
                  <div>
                    <label className="mb-1 block text-sm">الاسم</label>
                    <Input name="name" defaultValue={supplier.name} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الجوال</label>
                    <Input name="phone" dir="ltr" defaultValue={supplier.phone ?? ""} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">العنوان</label>
                    <Input name="address" defaultValue={supplier.address ?? ""} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">السجل التجاري (اختياري)</label>
                    <Input
                      name="commercialRegistrationNumber"
                      dir="ltr"
                      defaultValue={supplier.commercial_registration_number ?? ""}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الرقم الضريبي (اختياري)</label>
                    <Input name="vatNumber" dir="ltr" defaultValue={supplier.vat_number ?? ""} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">ملاحظات</label>
                    <Input name="notes" defaultValue={supplier.notes ?? ""} />
                  </div>
                </ActionForm>
              </ModalTrigger>
            ) : null}
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-foreground/60">الجوال: </span>
              {supplier.phone ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">العنوان: </span>
              {supplier.address ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">السجل التجاري: </span>
              {supplier.commercial_registration_number ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">الرقم الضريبي: </span>
              {supplier.vat_number ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">ملاحظات: </span>
              {supplier.notes ?? "—"}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">المستحق للمورد</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalOwed)}</p>
          <p className="mt-1 text-sm text-foreground/60">
            مجموع فواتير الشراء غير المدفوعة/الجزئية بعد خصم الدفعات المسددة
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">المنتجات</h2>
          {canManage ? (
            <ModalTrigger label="+ إضافة منتج" title={`إضافة منتج — ${supplier.name}`}>
              {(units?.length ?? 0) > 0 ? (
                <ActionForm action={createProductAction} className="space-y-3">
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <div>
                    <label className="mb-1 block text-sm">الاسم</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الوصف</label>
                    <Input name="description" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">سعر الشراء</label>
                    <Input name="price" type="number" step="0.01" min="0" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الوحدة الأساسية</label>
                    <Select name="baseUnitId" required>
                      <option value="">اختر وحدة</option>
                      {(units ?? []).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </ActionForm>
              ) : (
                <p className="text-sm text-foreground/60">أضف وحدة قياس واحدة على الأقل أولًا من صفحة المنتجات</p>
              )}
            </ModalTrigger>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>الفئة</th>
                <th>الوحدة الأساسية</th>
                <th>سعر البيع</th>
                <th>الكمية بالمخزون</th>
                <th>الحالة</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {(supplierProducts ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.name}</td>
                  <td>{p.category_id ? categoryNameById.get(p.category_id) : "—"}</td>
                  <td>{unitNameById.get(p.base_unit_id) ?? "—"}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td>{quantityByProductId.get(p.id) ?? 0}</td>
                  <td>{p.is_active ? "نشط" : "مؤرشف"}</td>
                  {canManage ? (
                    <td className="py-2">
                      <ModalTrigger label="تعديل" title={`تعديل: ${p.name}`} variant="outline" buttonSize="sm">
                        <ActionForm action={updateProductAction} className="space-y-3">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="supplierId" value={supplier.id} />
                          <div>
                            <label className="mb-1 block text-sm">الاسم</label>
                            <Input name="name" defaultValue={p.name} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الوصف</label>
                            <Input name="description" defaultValue={p.description ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">صورة المنتج</label>
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="mb-2 h-16 w-16 rounded-lg object-cover"
                              />
                            ) : null}
                            <Input name="image" type="file" accept="image/*" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">
                              سعر البيع <span className="text-foreground/50">(شامل ضريبة القيمة المضافة)</span>
                            </label>
                            <Input name="price" type="number" step="0.01" min="0" defaultValue={p.price} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الكمية بالمخزون</label>
                            <Input
                              name="quantity"
                              type="number"
                              step="1"
                              min="0"
                              defaultValue={quantityByProductId.get(p.id) ?? 0}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">سبب تعديل الكمية (إن غيّرتها)</label>
                            <Input name="quantityReason" placeholder="مثال: جرد دوري" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الفئة</label>
                            <Select name="categoryId" defaultValue={p.category_id ?? ""}>
                              <option value="">بدون فئة</option>
                              {(categories ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الوحدة الأساسية</label>
                            <Select name="baseUnitId" required defaultValue={p.base_unit_id}>
                              <option value="">اختر وحدة</option>
                              {(units ?? []).map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="visibleInStore" defaultChecked={p.visible_in_store} />{" "}
                            ظاهر بالمتجر
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="hasExpiry" defaultChecked={p.has_expiry} /> له تاريخ
                            صلاحية
                          </label>
                          <div>
                            <label className="mb-1 block text-sm">تاريخ الصلاحية (إن وُجد)</label>
                            <DatePicker name="expiryDate" defaultValue={p.expiry_date ?? ""} />
                          </div>
                        </ActionForm>
                      </ModalTrigger>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(supplierProducts?.length ?? 0) === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد منتجات مرتبطة بهذا المورد بعد</p>
        ) : null}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">فواتير الشراء</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => {
              const isActive = (searchParams.status ?? "") === (s.value ?? "");
              const href = s.value
                ? `/suppliers/${supplier.id}?status=${s.value}`
                : `/suppliers/${supplier.id}`;
              return (
                <Link
                  key={s.label}
                  href={href}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background hover:bg-muted",
                  )}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>المتبقي</th>
                <th>حالة الدفع</th>
                <th>المرفق</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {purchaseInvoices.map((inv) => {
                const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
                const isSettled = inv.payment_status !== "unpaid" && inv.payment_status !== "partial";
                return (
                  <tr key={inv.id} className="border-b border-border/50">
                    <td className="py-2">
                      <Link href={`/purchases/${inv.id}`} className="text-primary underline">
                        #{inv.invoice_number}
                      </Link>
                    </td>
                    <td>{new Date(inv.invoice_date).toLocaleDateString("ar-SA")}</td>
                    <td>{formatCurrency(inv.total_amount)}</td>
                    <td>{isSettled ? "—" : formatCurrency(remaining)}</td>
                    <td>{PAYMENT_STATUS_LABELS[inv.payment_status] ?? inv.payment_status}</td>
                    <td>
                      {attachmentUrlByInvoiceId.get(inv.id) ? (
                        <a
                          href={attachmentUrlByInvoiceId.get(inv.id)!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          عرض المرفق
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    {canManage ? (
                      <td>
                        {!isSettled ? (
                          <ModalTrigger label="تسجيل دفعة" title="تسجيل دفعة" variant="outline" buttonSize="sm">
                            <RecordInvoicePaymentForm
                              supplierId={supplier.id}
                              purchaseInvoiceId={inv.id}
                              remaining={remaining}
                            />
                          </ModalTrigger>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {purchaseInvoices.length === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد فواتير شراء بعد</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">الدفعات المسددة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>رقم الفاتورة</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString("ar-SA")}</td>
                  <td>
                    {p.purchase_invoice_id ? (
                      <Link href={`/purchases/${p.purchase_invoice_id}`} className="text-primary underline">
                        #{invoiceNumberById.get(p.purchase_invoice_id) ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(payments?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد دفعات بعد</p> : null}
      </Card>
    </div>
  );
}
