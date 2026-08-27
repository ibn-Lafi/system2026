import { Card, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { ReturnForm } from "./return-form";

type ReturnRecordRow = {
  id: string;
  return_date: string;
  total_credit_amount: number;
  customer_id: string;
};

export default async function ReturnsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: returns }, { data: customers }] = await Promise.all([
    supabase
      .from("return_records")
      .select<
        "id, return_date, total_credit_amount, customer_id",
        ReturnRecordRow
      >("id, return_date, total_credit_amount, customer_id")
      .order("return_date", { ascending: false })
      .limit(50),
    supabase
      .from("customers")
      .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
        "id, name, shop_name",
      )
      .order("name"),
  ]);

  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الفواتير", "المرتجعات"]} />}
        title="المرتجعات"
        actions={
          hasPermission(role, "manage_returns") && (customers?.length ?? 0) > 0 ? (
            <ModalTrigger label="+ تسجيل مرتجع" title="تسجيل مرتجع جديد" size="lg">
              <ReturnForm customers={customers ?? []} />
            </ModalTrigger>
          ) : null
        }
      />

      {hasPermission(role, "manage_returns") && (customers?.length ?? 0) === 0 ? (
        <p className="text-sm text-foreground/60">أضف عميلًا واحدًا على الأقل أولًا لتتمكن من تسجيل مرتجع</p>
      ) : null}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>العميل</th>
                <th>قيمة التسوية</th>
              </tr>
            </thead>
            <tbody>
              {(returns ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(r.return_date).toLocaleString("ar-SA")}</td>
                  <td>{customerNameById.get(r.customer_id) ?? "—"}</td>
                  <td>{formatCurrency(r.total_credit_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(returns?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد مرتجعات بعد</p> : null}
      </Card>
    </div>
  );
}
