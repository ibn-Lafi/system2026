import { redirect } from "next/navigation";
import { Card, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { payPayrollItemAction } from "./actions";

type UnpaidItemRow = {
  id: string;
  employee_id: string;
  payroll_run_id: string;
  net_salary: number;
};
type PayrollRunRow = { id: string; period_month: number; period_year: number };
type EmployeeOption = { id: string; full_name: string };
type WagePaymentRow = { id: string; payroll_item_id: string; payment_date: string; method: string; amount: number };

export default async function HrPayrollPaymentsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: unpaidItems }, { data: runs }, { data: employees }, { data: payments }] = await Promise.all([
    supabase
      .from("payroll_items")
      .select<"id, employee_id, payroll_run_id, net_salary", UnpaidItemRow>(
        "id, employee_id, payroll_run_id, net_salary",
      )
      .eq("is_paid", false),
    supabase.from("payroll_runs").select<"id, period_month, period_year", PayrollRunRow>("id, period_month, period_year"),
    supabase.from("employees").select<"id, full_name", EmployeeOption>("id, full_name"),
    supabase
      .from("wage_payments")
      .select<"id, payroll_item_id, payment_date, method, amount", WagePaymentRow>(
        "id, payroll_item_id, payment_date, method, amount",
      )
      .order("payment_date", { ascending: false })
      .limit(50),
  ]);

  const employeeNameById = new Map((employees ?? []).map((e) => [e.id, e.full_name]));
  const runById = new Map((runs ?? []).map((r) => [r.id, r]));

  const METHOD_LABELS: Record<string, string> = { cash: "نقدًا", check: "شيك", transfer: "تحويل بنكي" };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "صرف الأجور"]} />}
        title="صرف الأجور"
        subtitle="صرف بنود الرواتب المعتمدة — يقفل المسير تلقائيًا عند صرف كل بنوده"
      />

      <Card>
        <h2 className="mb-3 font-semibold">بنود لم تُصرف بعد</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الموظف</th>
                <th>المسير</th>
                <th>الصافي</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(unpaidItems ?? []).map((item) => {
                const run = runById.get(item.payroll_run_id);
                return (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2">{employeeNameById.get(item.employee_id) ?? "—"}</td>
                    <td>{run ? `${run.period_month}/${run.period_year}` : "—"}</td>
                    <td className="font-semibold">{item.net_salary.toLocaleString("ar-SA")}</td>
                    <td>
                      <ModalTrigger label="صرف" title="صرف راتب">
                        <ActionForm action={payPayrollItemAction} className="space-y-3">
                          <input type="hidden" name="payrollItemId" value={item.id} />
                          <p className="text-sm text-foreground/70">
                            المبلغ: <span className="font-semibold text-foreground">{item.net_salary.toLocaleString("ar-SA")}</span>
                          </p>
                          <div>
                            <label className="mb-1 block text-sm">طريقة الصرف</label>
                            <Select name="method" defaultValue="transfer">
                              <option value="transfer">تحويل بنكي</option>
                              <option value="cash">نقدًا</option>
                              <option value="check">شيك</option>
                            </Select>
                          </div>
                        </ActionForm>
                      </ModalTrigger>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(unpaidItems?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد بنود بانتظار الصرف</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">آخر عمليات الصرف</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>الطريقة</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.payment_date}</td>
                  <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td>{p.amount.toLocaleString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(payments?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد عمليات صرف بعد</p> : null}
      </Card>
    </div>
  );
}
