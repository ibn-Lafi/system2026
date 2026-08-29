import { redirect } from "next/navigation";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { adjustLeaveBalanceAction } from "./actions";

type BalanceRow = {
  id: string;
  employee_id: string;
  leave_type: "annual" | "sick" | "unpaid" | "other";
  year: number;
  entitled_days: number;
  used_days: number;
};

type EmployeeOption = { id: string; full_name: string };

const LEAVE_TYPE_LABELS: Record<BalanceRow["leave_type"], string> = {
  annual: "سنوية",
  sick: "مرضية",
  unpaid: "بدون راتب",
  other: "أخرى",
};

const CURRENT_YEAR = new Date().getFullYear();

export default async function HrLeaveBalancesPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: balances }, { data: employees }] = await Promise.all([
    supabase
      .from("employee_leave_balances")
      .select<"id, employee_id, leave_type, year, entitled_days, used_days", BalanceRow>(
        "id, employee_id, leave_type, year, entitled_days, used_days",
      )
      .order("year", { ascending: false }),
    supabase
      .from("employees")
      .select<"id, full_name", EmployeeOption>("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const employeeNameById = new Map((employees ?? []).map((e) => [e.id, e.full_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "أرصدة الإجازات"]} />}
        title="أرصدة الإجازات"
        subtitle="الأيام المستحقة والمستخدمة لكل موظف بكل سنة"
        actions={
          <ModalTrigger label="+ تحديد رصيد مستحق" title="تحديد رصيد إجازة مستحق">
            <ActionForm action={adjustLeaveBalanceAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">الموظف</label>
                <Select name="employeeId" required>
                  <option value="">اختر موظفًا</option>
                  {(employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">نوع الإجازة</label>
                <Select name="leaveType" defaultValue="annual">
                  <option value="annual">سنوية</option>
                  <option value="sick">مرضية</option>
                  <option value="unpaid">بدون راتب</option>
                  <option value="other">أخرى</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">السنة</label>
                <Input name="year" type="number" defaultValue={CURRENT_YEAR} required />
              </div>
              <div>
                <label className="mb-1 block text-sm">عدد الأيام المستحقة</label>
                <Input name="entitledDays" type="number" step="0.5" min="0" required />
              </div>
            </ActionForm>
          </ModalTrigger>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الموظف</th>
                <th>النوع</th>
                <th>السنة</th>
                <th>المستحق</th>
                <th>المستخدم</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {(balances ?? []).map((b) => (
                <tr key={b.id} className="border-b border-border/50">
                  <td className="py-2">{employeeNameById.get(b.employee_id) ?? "—"}</td>
                  <td>{LEAVE_TYPE_LABELS[b.leave_type]}</td>
                  <td>{b.year}</td>
                  <td>{b.entitled_days}</td>
                  <td>{b.used_days}</td>
                  <td>{(b.entitled_days - b.used_days).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(balances?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد أرصدة إجازات بعد</p> : null}
      </Card>
    </div>
  );
}
