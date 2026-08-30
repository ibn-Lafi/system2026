import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, ModalTrigger, PageHeader, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { createLeaveRequestAction, approveLeaveRequestAction, rejectLeaveRequestAction } from "./actions";

type LeaveRequestRow = {
  id: string;
  employee_id: string;
  leave_type: "annual" | "sick" | "unpaid" | "other";
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
};

type EmployeeOption = { id: string; full_name: string };

const LEAVE_TYPE_LABELS: Record<LeaveRequestRow["leave_type"], string> = {
  annual: "سنوية",
  sick: "مرضية",
  unpaid: "بدون راتب",
  other: "أخرى",
};

const STATUS_LABELS: Record<LeaveRequestRow["status"], string> = {
  pending: "قيد المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
};

const STATUS_BADGE: Record<LeaveRequestRow["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default async function HrLeavesPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: requests }, { data: employees }] = await Promise.all([
    supabase
      .from("leave_requests")
      .select<
        "id, employee_id, leave_type, start_date, end_date, days_count, reason, status",
        LeaveRequestRow
      >("id, employee_id, leave_type, start_date, end_date, days_count, reason, status")
      .order("start_date", { ascending: false }),
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
        title="الإجازات"
        actions={
          <ModalTrigger label="+ طلب إجازة" title="تقديم طلب إجازة">
            <ActionForm action={createLeaveRequestAction} className="space-y-3">
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

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الموظف</th>
                <th>النوع</th>
                <th>الفترة</th>
                <th>الأيام</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2">{employeeNameById.get(r.employee_id) ?? "—"}</td>
                  <td>{LEAVE_TYPE_LABELS[r.leave_type]}</td>
                  <td>
                    {r.start_date} → {r.end_date}
                  </td>
                  <td>{r.days_count}</td>
                  <td>
                    <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </td>
                  <td>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <form action={approveLeaveRequestAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" size="sm">
                            اعتماد
                          </Button>
                        </form>
                        <form action={rejectLeaveRequestAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            رفض
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(requests?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد طلبات إجازة بعد</p> : null}
      </Card>
    </div>
  );
}
