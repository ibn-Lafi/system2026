import { redirect } from "next/navigation";
import { Badge, Card, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { recordAttendanceAction } from "./actions";

type AttendanceRow = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "present" | "absent" | "late" | "on_leave";
  notes: string | null;
};

type EmployeeOption = { id: string; full_name: string };

const STATUS_LABELS: Record<AttendanceRow["status"], string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  on_leave: "إجازة",
};

const STATUS_BADGE: Record<AttendanceRow["status"], "success" | "danger" | "warning" | "muted"> = {
  present: "success",
  absent: "danger",
  late: "warning",
  on_leave: "muted",
};

export default async function HrAttendancePage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: records }, { data: employees }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select<"id, employee_id, work_date, check_in, check_out, status, notes", AttendanceRow>(
        "id, employee_id, work_date, check_in, check_out, status, notes",
      )
      .order("work_date", { ascending: false })
      .limit(100),
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
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "الحضور"]} />}
        title="الحضور"
        subtitle="تسجيل حضور وانصراف الموظفين يوميًا"
        actions={
          <ModalTrigger label="+ تسجيل حضور" title="تسجيل حضور يوم">
            <ActionForm action={recordAttendanceAction} className="space-y-3">
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
                <label className="mb-1 block text-sm">التاريخ</label>
                <Input name="workDate" type="date" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm">وقت الدخول</label>
                  <Input name="checkIn" type="time" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">وقت الخروج</label>
                  <Input name="checkOut" type="time" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm">الحالة</label>
                <Select name="status" defaultValue="present">
                  <option value="present">حاضر</option>
                  <option value="absent">غائب</option>
                  <option value="late">متأخر</option>
                  <option value="on_leave">إجازة</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">ملاحظات</label>
                <Input name="notes" />
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
                <th className="py-2">التاريخ</th>
                <th>الموظف</th>
                <th>الدخول</th>
                <th>الخروج</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2">{r.work_date}</td>
                  <td>{employeeNameById.get(r.employee_id) ?? "—"}</td>
                  <td dir="ltr">{r.check_in ? new Date(r.check_in).toLocaleTimeString("ar-SA") : "—"}</td>
                  <td dir="ltr">{r.check_out ? new Date(r.check_out).toLocaleTimeString("ar-SA") : "—"}</td>
                  <td>
                    <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(records?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد سجلات حضور بعد</p> : null}
      </Card>
    </div>
  );
}
