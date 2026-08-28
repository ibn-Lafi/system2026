import Link from "next/link";
import { Button, Card, Input, LinkButton, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { createCustomerAction, updateCustomerAction, createCityAction, updateCityAction } from "./actions";
import { PaymentForm } from "../collections/payment-form";
import { ReturnForm } from "../returns/return-form";

type Customer = {
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
type City = { id: string; name: string };
type UnpaidInvoiceRow = { id: string; invoice_number: number; customer_id: string; total_amount: number };
type CustomerPaymentRow = { invoice_id: string | null; amount: number };

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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { cityId?: string };
}) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_customers");
  const canCollect = hasPermission(role, "manage_collections");
  const canReturn = hasPermission(role, "manage_returns");

  let customersQuery = supabase
    .from("customers")
    .select<
      "id, name, shop_name, phone, address, notes, google_maps_link, commercial_registration_number, vat_number, show_in_store, city_id",
      Customer
    >(
      "id, name, shop_name, phone, address, notes, google_maps_link, commercial_registration_number, vat_number, show_in_store, city_id",
    )
    .order("name");
  if (searchParams.cityId) customersQuery = customersQuery.eq("city_id", searchParams.cityId);

  const [{ data: customers }, { data: cities }, { data: unpaidInvoices }, { data: customerPayments }] =
    await Promise.all([
      customersQuery,
      supabase.from("cities").select<"id, name", City>("id, name").order("name"),
      supabase
        .from("invoices")
        .select<"id, invoice_number, customer_id, total_amount", UnpaidInvoiceRow>(
          "id, invoice_number, customer_id, total_amount",
        )
        .in("status", ["unpaid", "partial"]),
      supabase.from("payments").select<"invoice_id, amount", CustomerPaymentRow>("invoice_id, amount"),
    ]);

  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));

  const paidByInvoice = new Map<string, number>();
  for (const p of customerPayments ?? []) {
    if (!p.invoice_id) continue;
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
  }
  const invoicesByCustomer: Record<string, { id: string; invoice_number: number; remaining: number }[]> = {};
  for (const inv of unpaidInvoices ?? []) {
    const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
    if (remaining <= 0) continue;
    invoicesByCustomer[inv.customer_id] ??= [];
    invoicesByCustomer[inv.customer_id]!.push({ id: inv.id, invoice_number: inv.invoice_number, remaining });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "العملاء"]} />}
        title="العملاء"
        subtitle="إدارة بيانات العملاء"
        actions={
          <>
            {canCollect && (customers?.length ?? 0) > 0 ? (
              <ModalTrigger label="+ تسجيل تحصيل" title="تسجيل تحصيل" variant="outline">
                <PaymentForm customers={customers ?? []} invoicesByCustomer={invoicesByCustomer} />
              </ModalTrigger>
            ) : null}
            {canReturn && (customers?.length ?? 0) > 0 ? (
              <ModalTrigger label="+ تسجيل مرتجع" title="تسجيل مرتجع جديد" variant="outline" size="lg">
                <ReturnForm customers={customers ?? []} />
              </ModalTrigger>
            ) : null}
            {canManage ? (
              <>
                <ModalTrigger label="+ مدينة" title="المدن" variant="outline" size="lg">
                  <div className="space-y-5">
                    <ActionForm action={createCityAction} className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm">اسم المدينة الجديدة</label>
                        <Input name="name" placeholder="مثال: الرياض" required />
                      </div>
                    </ActionForm>

                    <div className="border-t border-border pt-5">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                        المدن الحالية ({cities?.length ?? 0})
                      </h3>
                      {(cities?.length ?? 0) === 0 ? (
                        <p className="text-sm text-foreground/60">لا توجد مدن بعد</p>
                      ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {(cities ?? []).map((city) => (
                            <div
                              key={city.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-2.5"
                            >
                              <p className="truncate text-sm font-medium">{city.name}</p>
                              <ModalTrigger
                                label="تعديل"
                                title={`تعديل مدينة: ${city.name}`}
                                variant="outline"
                                buttonSize="sm"
                              >
                                <ActionForm action={updateCityAction} className="space-y-3">
                                  <input type="hidden" name="id" value={city.id} />
                                  <div>
                                    <label className="mb-1 block text-sm">الاسم</label>
                                    <Input name="name" defaultValue={city.name} required />
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
                <ModalTrigger label="+ إضافة عميل" title="إضافة عميل">
                <ActionForm action={createCustomerAction} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm">اسم السجل</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">اسم المحل</label>
                    <Input name="shopName" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الجوال</label>
                    <Input name="phone" dir="ltr" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">العنوان</label>
                    <Input name="address" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">المدينة</label>
                    <CitySelect cities={cities ?? []} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">ملاحظات</label>
                    <Input name="notes" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">رابط جوجل ماب</label>
                    <Input name="googleMapsLink" dir="ltr" placeholder="https://maps.google.com/..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">السجل التجاري (اختياري)</label>
                    <Input name="commercialRegistrationNumber" dir="ltr" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الرقم الضريبي (اختياري)</label>
                    <Input name="vatNumber" dir="ltr" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="showInStore" /> ظاهر بصفحة نقاط البيع العامة
                  </label>
                </ActionForm>
                </ModalTrigger>
              </>
            ) : null}
          </>
        }
      />

      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-foreground/60">فلترة حسب المدينة</label>
            <Select name="cityId" defaultValue={searchParams.cityId ?? ""} className="w-auto">
              <option value="">كل المدن</option>
              {(cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline">
            فلترة
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">اسم السجل</th>
                <th>المحل</th>
                <th>المدينة</th>
                <th>الجوال</th>
                <th>بالمتجر</th>
                <th>الموقع</th>
                <th>كشف الحساب</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2">{c.name}</td>
                  <td>{c.shop_name ?? "—"}</td>
                  <td>{c.city_id ? cityNameById.get(c.city_id) ?? "—" : "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{c.show_in_store ? "نعم" : "لا"}</td>
                  <td>
                    {c.google_maps_link ? (
                      <LinkButton
                        href={c.google_maps_link}
                        target="_blank"
                        rel="noreferrer"
                        variant="outline"
                        size="sm"
                      >
                        فتح الموقع
                      </LinkButton>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Link href={`/customers/${c.id}`} className="text-primary underline">
                      عرض
                    </Link>
                  </td>
                  {canManage ? (
                    <td>
                      <ModalTrigger label="تعديل" title={`تعديل: ${c.name}`} variant="outline" buttonSize="sm">
                        <ActionForm action={updateCustomerAction} className="space-y-3">
                          <input type="hidden" name="id" value={c.id} />
                          <div>
                            <label className="mb-1 block text-sm">اسم السجل</label>
                            <Input name="name" defaultValue={c.name} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">اسم المحل</label>
                            <Input name="shopName" defaultValue={c.shop_name ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الجوال</label>
                            <Input name="phone" dir="ltr" defaultValue={c.phone ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">العنوان</label>
                            <Input name="address" defaultValue={c.address ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">المدينة</label>
                            <CitySelect cities={cities ?? []} defaultValue={c.city_id} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">ملاحظات</label>
                            <Input name="notes" defaultValue={c.notes ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">رابط جوجل ماب</label>
                            <Input
                              name="googleMapsLink"
                              dir="ltr"
                              defaultValue={c.google_maps_link ?? ""}
                              placeholder="https://maps.google.com/..."
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">السجل التجاري (اختياري)</label>
                            <Input
                              name="commercialRegistrationNumber"
                              dir="ltr"
                              defaultValue={c.commercial_registration_number ?? ""}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الرقم الضريبي (اختياري)</label>
                            <Input name="vatNumber" dir="ltr" defaultValue={c.vat_number ?? ""} />
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="showInStore"
                              defaultChecked={c.show_in_store}
                            />{" "}
                            ظاهر بصفحة نقاط البيع العامة
                          </label>
                        </ActionForm>
                      </ModalTrigger>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(customers?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد عملاء بعد</p> : null}
      </Card>
    </div>
  );
}
