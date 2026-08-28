import { Badge, Button, Card, DatePicker, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { createCategoryAction, createProductAction, toggleProductActiveAction, updateCategoryAction, updateProductAction } from "./actions";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  average_cost: number;
  image_url: string | null;
  image_urls: string[];
  visible_in_store: boolean;
  is_active: boolean;
  has_expiry: boolean;
  expiry_date: string | null;
  category_id: string | null;
  supplier_id: string | null;
};
type CategoryRow = { id: string; name: string; image_url: string | null };
type StockRow = { product_id: string; quantity_available: number };

export default async function ProductsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_products");

  const [{ data: products }, { data: categories }, { data: stock }] = await Promise.all([
    // منتجات المورد لا تظهر هنا إطلاقًا — تُدار حصرًا من صفحة المورد نفسها
    // (راجع suppliers/[id]/page.tsx)، فهي منفصلة تمامًا عن الكتالوج العام.
    supabase
      .from("products")
      .select<
        "id, name, description, price, average_cost, image_url, image_urls, visible_in_store, is_active, has_expiry, expiry_date, category_id, supplier_id",
        ProductRow
      >(
        "id, name, description, price, average_cost, image_url, image_urls, visible_in_store, is_active, has_expiry, expiry_date, category_id, supplier_id",
      )
      .is("supplier_id", null)
      .order("name"),
    supabase
      .from("categories")
      .select<"id, name, image_url", CategoryRow>("id, name, image_url")
      .order("name"),
    supabase
      .from("warehouse_stock")
      .select<"product_id, quantity_available", StockRow>("product_id, quantity_available"),
  ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const quantityByProductId = new Map((stock ?? []).map((s) => [s.product_id, s.quantity_available]));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المنتجات"]} />}
        title="المنتجات"
        subtitle="إدارة كتالوج المنتجات والفئات"
        actions={
          canManage ? (
            <>
              <ModalTrigger label="+ فئة" title="الفئات" variant="outline" size="lg">
                <div className="space-y-5">
                  <ActionForm action={createCategoryAction} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm">اسم الفئة الجديدة</label>
                      <Input name="name" placeholder="مثال: مشروبات" required />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">
                        صورة الفئة (تظهر بدائرة اختيار الفئة بالمتجر)
                      </label>
                      <Input name="image" type="file" accept="image/*" />
                    </div>
                  </ActionForm>

                  <div className="border-t border-border pt-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                      الفئات الحالية ({categories?.length ?? 0})
                    </h3>
                    {(categories?.length ?? 0) === 0 ? (
                      <p className="text-sm text-foreground/60">لا توجد فئات بعد</p>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {(categories ?? []).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5"
                          >
                            {c.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.image_url}
                                alt={c.name}
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
                            )}
                            <p className="flex-1 truncate text-sm font-medium">{c.name}</p>
                            <ModalTrigger
                              label="تعديل"
                              title={`تعديل فئة: ${c.name}`}
                              variant="outline"
                              buttonSize="sm"
                            >
                              <ActionForm action={updateCategoryAction} className="space-y-3">
                                <input type="hidden" name="id" value={c.id} />
                                <div>
                                  <label className="mb-1 block text-sm">الاسم</label>
                                  <Input name="name" defaultValue={c.name} required />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm">الصورة</label>
                                  {c.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={c.image_url}
                                      alt={c.name}
                                      className="mb-2 h-16 w-16 rounded-full object-cover"
                                    />
                                  ) : null}
                                  <Input name="image" type="file" accept="image/*" />
                                </div>
                              </ActionForm>
                            </ModalTrigger>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ModalTrigger>
              <ModalTrigger label="+ إضافة منتج" title="إضافة منتج جديد">
                <ActionForm action={createProductAction} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm">الاسم</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الوصف</label>
                    <Input name="description" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">
                      صور المنتج <span className="text-foreground/50">(حتى 5 صور)</span>
                    </label>
                    <Input name="images" type="file" accept="image/*" multiple />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">
                      سعر البيع <span className="text-foreground/50">(شامل ضريبة القيمة المضافة)</span>
                    </label>
                    <Input name="price" type="number" step="0.01" min="0" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الفئة</label>
                    <Select name="categoryId">
                      <option value="">بدون فئة</option>
                      {(categories ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="visibleInStore" defaultChecked /> ظاهر بالمتجر
                  </label>
                  <div>
                    <label className="mb-1 block text-sm">تاريخ الصلاحية (إن وُجد)</label>
                    <DatePicker name="expiryDate" />
                  </div>
                </ActionForm>
              </ModalTrigger>
            </>
          ) : null
        }
      />

      <Card>
        <h2 className="mb-3 font-semibold">قائمة المنتجات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الصورة</th>
                <th>الاسم</th>
                <th>الفئة</th>
                <th>سعر البيع</th>
                <th>متوسط التكلفة</th>
                <th>الكمية بالمخزون</th>
                <th>بالمتجر</th>
                <th>الحالة</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className={`border-b border-border/50 ${!p.is_active ? "opacity-50" : ""}`}>
                  <td className="py-2">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted" />
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category_id ? categoryNameById.get(p.category_id) : "—"}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td>{formatCurrency(p.average_cost)}</td>
                  <td>{quantityByProductId.get(p.id) ?? 0}</td>
                  <td>{p.visible_in_store ? "نعم" : "لا"}</td>
                  <td>
                    <Badge variant={p.is_active ? "success" : "muted"}>
                      {p.is_active ? "نشط" : "مؤرشف"}
                    </Badge>
                  </td>
                  {canManage ? (
                    <td className="flex flex-wrap gap-2 py-2">
                      <form action={toggleProductActiveAction}>
                        <input type="hidden" name="productId" value={p.id} />
                        <input type="hidden" name="nextIsActive" value={(!p.is_active).toString()} />
                        <Button type="submit" variant="outline" size="sm">
                          {p.is_active ? "أرشفة" : "إعادة تفعيل"}
                        </Button>
                      </form>
                      <ModalTrigger label="تعديل" title={`تعديل: ${p.name}`} variant="outline" buttonSize="sm">
                        <ActionForm action={updateProductAction} className="space-y-3">
                          <input type="hidden" name="id" value={p.id} />
                          <div>
                            <label className="mb-1 block text-sm">الاسم</label>
                            <Input name="name" defaultValue={p.name} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الوصف</label>
                            <Input name="description" defaultValue={p.description ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">
                              صور المنتج <span className="text-foreground/50">(حتى 5 صور — رفع صور جديدة يستبدل الحالية)</span>
                            </label>
                            {p.image_urls.length > 0 ? (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {p.image_urls.map((url) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={url}
                                    src={url}
                                    alt={p.name}
                                    className="h-16 w-16 rounded-lg object-cover"
                                  />
                                ))}
                              </div>
                            ) : p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="mb-2 h-16 w-16 rounded-lg object-cover"
                              />
                            ) : null}
                            <Input name="images" type="file" accept="image/*" multiple />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">
                              سعر البيع <span className="text-foreground/50">(شامل ضريبة القيمة المضافة)</span>
                            </label>
                            <Input
                              name="price"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={p.price}
                              required
                            />
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
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="visibleInStore"
                              defaultChecked={p.visible_in_store}
                            />{" "}
                            ظاهر بالمتجر
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
          {(products?.length ?? 0) === 0 ? (
            <p className="py-4 text-foreground/60">لا توجد منتجات بعد</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
