import { notFound } from "next/navigation";
import { Badge, Card, Input, LinkButton, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { createBranchAction, updateBranchAction } from "../actions";

type CustomerDetail = {
  id: string;
  name: string;
  shop_name: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  google_maps_link: string | null;
  commercial_registration_number: string | null;
  vat_number: string | null;
  show_in_store: boolean;
  city_id: string | null;
};

type BranchRow = {
  id: string;
  name: string;
  shop_name: string | null;
  address: string | null;
  city_id: string | null;
  phone: string | null;
  google_maps_link: string | null;
  show_in_store: boolean;
};

type City = { id: string; name: string };

function CitySelect({ cities, defaultValue }: { cities: City[]; defaultValue?: string | null }) {
  return (
    <Select name="cityId" defaultValue={defaultValue ?? ""}>
      <option value="">بدون مدينة</option>
      {cities.map((city) => (
        <option key={city.id} value={city.id}>
          {city.name}
        </option>
      ))}
    </Select>
  );
}

function BranchFormFields({ cities, branch }: { cities: City[]; branch?: BranchRow }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm">اسم الفرع</label>
        <Input name="name" placeholder="مثال: فرع العليا" defaultValue={branch?.name ?? ""} required />
      </div>
      <div>
        <label className="mb-1 block text-sm">اسم المحل (يظهر بالمتجر)</label>
        <Input name="shopName" defaultValue={branch?.shop_name ?? ""} />
      </div>
      <div>
        <label className="mb-1 block text-sm">العنوان</label>
        <Input name="address" defaultValue={branch?.address ?? ""} />
      </div>
      <div>
        <label className="mb-1 block text-sm">المدينة</label>
        <CitySelect cities={cities} defaultValue={branch?.city_id} />
      </div>
      <div>
        <label className="mb-1 block text-sm">الجوال</label>
        <Input name="phone" dir="ltr" defaultValue={branch?.phone ?? ""} />
      </div>
      <div>
        <label className="mb-1 block text-sm">رابط جوجل ماب</label>
        <Input
          name="googleMapsLink"
          dir="ltr"
          defaultValue={branch?.google_maps_link ?? ""}
          placeholder="https://maps.google.com/..."
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="showInStore" defaultChecked={branch?.show_in_store} /> ظاهر
        كنقطة بيع مستقلة بالمتجر
      </label>
    </>
  );
}

type InvoiceRow = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  total_amount: number;
  status: string;
};

type PaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  invoice_id: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  check: "شيك",
  transfer: "تحويل بنكي",
};

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_customers");

  const { data: customer } = await supabase
    .from("customers")
    .select<
      "id, name, shop_name, phone, address, notes, google_maps_link, commercial_registration_number, vat_number, show_in_store, city_id",
      CustomerDetail
    >(
      "id, name, shop_name, phone, address, notes, google_maps_link, commercial_registration_number, vat_number, show_in_store, city_id",
    )
    .eq("id", params.id)
    .single();

  if (!customer) notFound();

  const [{ data: invoices }, { data: payments }, { data: branches }, { data: cities }] = await Promise.all([
    supabase
      .from("invoices")
      .select<"id, invoice_number, invoice_date, total_amount, status", InvoiceRow>(
        "id, invoice_number, invoice_date, total_amount, status",
      )
      .eq("customer_id", customer.id)
      .order("invoice_number", { ascending: false }),
    supabase
      .from("payments")
      .select<"id, payment_date, amount, method, invoice_id", PaymentRow>(
        "id, payment_date, amount, method, invoice_id",
      )
      .eq("customer_id", customer.id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("customer_branches")
      .select<
        "id, name, shop_name, address, city_id, phone, google_maps_link, show_in_store",
        BranchRow
      >("id, name, shop_name, address, city_id, phone, google_maps_link, show_in_store")
      .eq("customer_id", customer.id)
      .order("name"),
    supabase.from("cities").select<"id, name", City>("id, name").order("name"),
  ]);

  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.invoice_id) continue;
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
  }

  const totalDebt = (invoices ?? [])
    .filter((inv) => inv.status === "unpaid" || inv.status === "partial")
    .reduce((sum, inv) => sum + (inv.total_amount - (paidByInvoice.get(inv.id) ?? 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "العملاء", customer.shop_name ?? customer.name]} />}
        title={customer.shop_name ?? customer.name}
        subtitle="كشف حساب العميل: الفواتير، الدفعات، والرصيد المستحق"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">بيانات العميل</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-foreground/60">اسم السجل: </span>
              {customer.name}
            </p>
            <p>
              <span className="text-foreground/60">الجوال: </span>
              {customer.phone ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">العنوان: </span>
              {customer.address ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">المدينة: </span>
              {customer.city_id ? cityNameById.get(customer.city_id) ?? "—" : "—"}
            </p>
            <p>
              <span className="text-foreground/60">السجل التجاري: </span>
              {customer.commercial_registration_number ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">الرقم الضريبي: </span>
              {customer.vat_number ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">ملاحظات: </span>
              {customer.notes ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">ظاهر بالمتجر: </span>
              <Badge variant={customer.show_in_store ? "success" : "muted"}>
                {customer.show_in_store ? "نعم" : "لا"}
              </Badge>
            </p>
            {customer.google_maps_link ? (
              <LinkButton
                href={customer.google_maps_link}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                size="sm"
                className="mt-2"
              >
                فتح الموقع
              </LinkButton>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">الرصيد المستحق</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalDebt)}</p>
          <p className="mt-1 text-sm text-foreground/60">
            مجموع الفواتير غير المدفوعة/الجزئية بعد خصم الدفعات المسجّلة
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">الفروع</h2>
            <p className="text-sm text-foreground/60">
              للعملاء أصحاب أكثر من موقع بيع — كل فرع نقطة بيع مستقلة بالمتجر العام
            </p>
          </div>
          {canManage ? (
            <ModalTrigger label="+ إضافة فرع" title="إضافة فرع" variant="outline">
              <ActionForm action={createBranchAction} className="space-y-3">
                <input type="hidden" name="customerId" value={customer.id} />
                <BranchFormFields cities={cities ?? []} />
              </ActionForm>
            </ModalTrigger>
          ) : null}
        </div>
        {(branches?.length ?? 0) === 0 ? (
          <p className="text-sm text-foreground/60">لا توجد فروع لهذا العميل</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-foreground/60">
                  <th className="py-2">الفرع</th>
                  <th>المحل</th>
                  <th>المدينة</th>
                  <th>الجوال</th>
                  <th>بالمتجر</th>
                  {canManage ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {(branches ?? []).map((b) => (
                  <tr key={b.id} className="border-b border-border/50">
                    <td className="py-2">{b.name}</td>
                    <td>{b.shop_name ?? "—"}</td>
                    <td>{b.city_id ? cityNameById.get(b.city_id) ?? "—" : "—"}</td>
                    <td>{b.phone ?? "—"}</td>
                    <td>
                      <Badge variant={b.show_in_store ? "success" : "muted"}>
                        {b.show_in_store ? "نعم" : "لا"}
                      </Badge>
                    </td>
                    {canManage ? (
                      <td>
                        <ModalTrigger label="تعديل" title={`تعديل: ${b.name}`} variant="outline" buttonSize="sm">
                          <ActionForm action={updateBranchAction} className="space-y-3">
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="customerId" value={customer.id} />
                            <BranchFormFields cities={cities ?? []} branch={b} />
                          </ActionForm>
                        </ModalTrigger>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">الفواتير</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="py-2">#{inv.invoice_number}</td>
                  <td>{new Date(inv.invoice_date).toLocaleDateString("ar-SA")}</td>
                  <td>{formatCurrency(inv.total_amount)}</td>
                  <td>
                    {inv.status === "unpaid" || inv.status === "partial"
                      ? formatCurrency(inv.total_amount - (paidByInvoice.get(inv.id) ?? 0))
                      : "—"}
                  </td>
                  <td>{STATUS_LABELS[inv.status] ?? inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(invoices?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد فواتير بعد</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">الدفعات المسددة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString("ar-SA")}</td>
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
