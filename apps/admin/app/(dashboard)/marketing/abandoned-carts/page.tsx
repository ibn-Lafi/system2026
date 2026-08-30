import { redirect } from "next/navigation";
import { Card, MetricCard, PageHeader } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";

type CartItemSnapshot = { productId: string; name: string; price: number; quantity: number };

type CartSessionRow = {
  id: string;
  customer_id: string;
  items: CartItemSnapshot[];
  subtotal: number;
  last_activity_at: string;
};

// +9665XXXXXXXX → 05XXXXXXXX للعرض، ونفس الرقم لرابط واتساب (wa.me يقبل
// الصيغة الدولية بدون +).
function formatPhone(phone: string): string {
  return phone.replace(/^\+966/, "0");
}

function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/^\+/, "")}`;
}

// السلات المتروكة = عملاء حدّدوا هويتهم (رقم جوال) بصفحة /checkout بالمتجر
// ولديهم بنود بالسلة، لكن لم يُكملوا الطلب. راجع migration
// 20260830040000_store_cart_sessions.sql لتفاصيل نطاق التتبّع وحدوده.
export default async function AbandonedCartsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("store_cart_sessions")
    .select<"id, customer_id, items, subtotal, last_activity_at", CartSessionRow>(
      "id, customer_id, items, subtotal, last_activity_at",
    )
    .is("converted_at", null)
    .order("last_activity_at", { ascending: false });
  const sessions = data ?? [];

  const customerNameById = new Map<string, string>();
  const customerPhoneById = new Map<string, string | null>();
  const customerIds = Array.from(new Set(sessions.map((s) => s.customer_id)));
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select<"id, name, phone", { id: string; name: string; phone: string | null }>("id, name, phone")
      .in("id", customerIds);
    for (const c of customers ?? []) {
      customerNameById.set(c.id, c.name);
      customerPhoneById.set(c.id, c.phone);
    }
  }

  const totalValue = sessions.reduce((sum, s) => sum + s.subtotal, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="السلات المتروكة" />

      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/60">لا توجد سلات متروكة حاليًا.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="عدد السلات المتروكة" value={sessions.length.toString()} />
            <MetricCard label="القيمة الإجمالية المتروكة" value={formatCurrency(totalValue)} />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-foreground/60">
                    <th className="py-2">العميل</th>
                    <th>رقم الجوال</th>
                    <th>عدد المنتجات</th>
                    <th>القيمة</th>
                    <th>آخر نشاط</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const phone = customerPhoneById.get(session.customer_id);
                    const itemsCount = session.items.reduce((sum, i) => sum + i.quantity, 0);
                    return (
                      <tr key={session.id} className="border-b border-border/50">
                        <td className="py-2">{customerNameById.get(session.customer_id) ?? "—"}</td>
                        <td className="whitespace-nowrap" dir="ltr">
                          {phone ? formatPhone(phone) : "—"}
                        </td>
                        <td>{itemsCount}</td>
                        <td>{formatCurrency(session.subtotal)}</td>
                        <td className="whitespace-nowrap text-foreground/60">
                          {new Date(session.last_activity_at).toLocaleString("ar-SA")}
                        </td>
                        <td>
                          {phone ? (
                            <a href={waLink(phone)} target="_blank" rel="noreferrer" className="text-primary underline">
                              تواصل واتساب
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
