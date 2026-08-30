import { redirect } from "next/navigation";
import { Badge, Card, Input, ModalTrigger, PageHeader } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { generatePayrollRunAction, updatePayrollItemDeductionsAction } from "./actions";

type PayrollRunRow = { id: string; period_month: number; period_year: number; status: "draft" | "paid" };
type PayrollItemRow = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  is_paid: boolean;
};
type EmployeeOption = { id: string; full_name: string };

const NOW = new Date();

export default async function HrPayrollPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: runs }, { data: items }, { data: employees }] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select<"id, period_month, period_year, status", PayrollRunRow>("id, period_month, period_year, status")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false }),
    supabase
      .from("payroll_items")
      .select<
        "id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, is_paid",
        PayrollItemRow
      >("id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, is_paid"),
    supabase.from("employees").select<"id, full_name", EmployeeOption>("id, full_name"),
  ]);

  const employeeNameById = new Map((employees ?? []).map((e) => [e.id, e.full_name]));
  const itemsByRun = new Map<string, PayrollItemRow[]>();
  for (const item of items ?? []) {
    const list = itemsByRun.get(item.payroll_run_id) ?? [];
    list.push(item);
    itemsByRun.set(item.payroll_run_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مسير الرواتب"
        actions={
          <ModalTrigger label="+ إنشاء مسير جديد" title="إنشاء مسير رواتب">
            <ActionForm action={generatePayrollRunAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm">الشهر</label>
                  <Input name="periodMonth" type="number" min={1} max={12} defaultValue={NOW.getMonth() + 1} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">السنة</label>
                  <Input name="periodYear" type="number" defaultValue={NOW.getFullYear()} required />
                </div>
              </div>
              <p className="text-xs text-foreground/60">
                يُنشئ بندًا لكل موظف نشط بلقطة راتبه الحالية (الأساسي + البدلات) — لا يمكن إنشاء مسير آخر لنفس الشهر/السنة.
              </p>
            </ActionForm>
          </ModalTrigger>
        }
      />

      <div className="space-y-4">
        {(runs ?? []).map((run) => (
          <Card key={run.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                مسير {run.period_month}/{run.period_year}
              </h2>
              <Badge variant={run.status === "paid" ? "success" : "warning"}>
                {run.status === "paid" ? "مصروف بالكامل" : "قيد الصرف"}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-foreground/60">
                    <th className="py-2">الموظف</th>
                    <th>الأساسي</th>
                    <th>البدلات</th>
                    <th>الخصومات</th>
                    <th>الصافي</th>
                    <th>الحالة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(itemsByRun.get(run.id) ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2">{employeeNameById.get(item.employee_id) ?? "—"}</td>
                      <td>{item.basic_salary.toLocaleString("ar-SA")}</td>
                      <td>{item.allowances.toLocaleString("ar-SA")}</td>
                      <td>{item.deductions.toLocaleString("ar-SA")}</td>
                      <td className="font-semibold">{item.net_salary.toLocaleString("ar-SA")}</td>
                      <td>
                        {item.is_paid ? <Badge variant="success">مصروف</Badge> : <Badge variant="muted">لم يُصرف</Badge>}
                      </td>
                      <td>
                        {!item.is_paid ? (
                          <ModalTrigger label="تعديل الخصومات" title="تعديل خصومات البند" variant="outline" buttonSize="sm">
                            <ActionForm action={updatePayrollItemDeductionsAction} className="space-y-3">
                              <input type="hidden" name="payrollItemId" value={item.id} />
                              <div>
                                <label className="mb-1 block text-sm">الخصومات</label>
                                <Input
                                  name="deductions"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={item.deductions}
                                  required
                                />
                              </div>
                            </ActionForm>
                          </ModalTrigger>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        {(runs?.length ?? 0) === 0 ? (
          <Card>
            <p className="py-4 text-center text-foreground/60">لا توجد مسيرات رواتب بعد</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
