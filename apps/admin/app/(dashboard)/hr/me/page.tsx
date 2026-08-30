import { Badge, Card, Input, ModalTrigger, PageHeader, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { createLeaveRequestAction } from "../leaves/actions";

type EmployeeSelf = {
  id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  hire_date: string;
  is_active: boolean;
};
type LeaveBalanceRow = { leave_type: string; year: number; entitled_days: number; used_days: number };
type LeaveRequestRow = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  status: "pending" | "approved" | "rejected";
};
type AttendanceRow = { work_date: string; status: string; check_in: string | null; check_out: string | null };
type PayrollItemRow = { id: string; net_salary: number; is_paid: boolean };

const LEAVE_TYPE_LABELS: Record<string, string> = { annual: "سنوية", sick: "مرضية", unpaid: "بدون راتب", other: "أخرى" };
const STATUS_LABELS: Record<LeaveRequestRow["status"], string> = { pending: "قيد المراجعة", approved: "معتمدة", rejected: "مرفوضة" };
const STATUS_BADGE: Record<LeaveRequestRow["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default async function HrMePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: employee } = user
    ? await supabase
        .from("employees")
        .select<"id, full_name, job_title, department, hire_date, is_active", EmployeeSelf>(
          "id, full_name, job_title, department, hire_date, is_active",
        )
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="بياناتي"
        />
        <Card>
          <p className="py-4 text-foreground/60">لا يوجد سجل موظف مرتبط بحسابك بعد.</p>
        </Card>
      </div>
    );
  }

  const [{ data: balances }, { data: leaveRequests }, { data: attendance }, { data: payrollItems }] =
    await Promise.all([
      supabase
        .from("employee_leave_balances")
        .select<"leave_type, year, entitled_days, used_days", LeaveBalanceRow>(
          "leave_type, year, entitled_days, used_days",
        )
        .eq("employee_id", employee.id)
        .order("year", { ascending: false }),
      supabase
        .from("leave_requests")
        .select<"id, leave_type, start_date, end_date, days_count, status", LeaveRequestRow>(
          "id, leave_type, start_date, end_date, days_count, status",
        )
        .eq("employee_id", employee.id)
        .order("start_date", { ascending: false })
        .limit(20),
      supabase
        .from("attendance_records")
        .select<"work_date, status, check_in, check_out", AttendanceRow>("work_date, status, check_in, check_out")
        .eq("employee_id", employee.id)
        .order("work_date", { ascending: false })
        .limit(20),
      supabase
        .from("payroll_items")
        .select<"id, net_salary, is_paid", PayrollItemRow>("id, net_salary, is_paid")
        .eq("employee_id", employee.id),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="بياناتي"
        actions={
          <ModalTrigger label="+ طلب إجازة" title="تقديم طلب إجازة">
            <ActionForm action={createLeaveRequestAction} className="space-y-3">
              <input type="hidden" name="employeeId" value={employee.id} />
              <div>
                <label className="mb-1 block text-sm">نوع الإجازة</label>
                <Select name="leaveType" defaultValue="annual">
                  <option value="annual">سنوية</option>
                  <option value="sick">مرضية</option>
                  <option value="unpaid">بدون راتب</option>
                  <option value="other">أخرى</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm">من تاريخ</label>
                  <Input name="startDate" type="date" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">إلى تاريخ</label>
                  <Input name="endDate" type="date" required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm">عدد الأيام</label>
                <Input name="daysCount" type="number" step="0.5" min="0.5" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">السبب</label>
                <Input name="reason" />
              </div>
            </ActionForm>
          </ModalTrigger>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">أرصدة الإجازات</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">النوع</th>
                <th>السنة</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {(balances ?? []).map((b, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2">{LEAVE_TYPE_LABELS[b.leave_type] ?? b.leave_type}</td>
                  <td>{b.year}</td>
                  <td>{(b.entitled_days - b.used_days).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(balances?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد أرصدة بعد</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">طلبات إجازتي</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الفترة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(leaveRequests ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2">
                    {r.start_date} → {r.end_date}
                  </td>
                  <td>
                    <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(leaveRequests?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد طلبات بعد</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">حضوري الأخير</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(attendance ?? []).map((a, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2">{a.work_date}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(attendance?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد سجلات بعد</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">رواتبي</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الصافي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(payrollItems ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.net_salary.toLocaleString("ar-SA")}</td>
                  <td>{p.is_paid ? <Badge variant="success">مصروف</Badge> : <Badge variant="muted">قيد الصرف</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(payrollItems?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد بنود رواتب بعد</p> : null}
        </Card>
      </div>
    </div>
  );
}
