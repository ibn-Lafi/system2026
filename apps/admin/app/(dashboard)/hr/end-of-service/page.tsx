import { redirect } from "next/navigation";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { calculateEndOfServiceAction } from "./actions";

type SettlementRow = {
  id: string;
  employee_id: string;
  termination_date: string;
  years_of_service: number;
  gratuity_amount: number;
  calculation_notes: string | null;
};
type EmployeeOption = { id: string; full_name: string };

export default async function HrEndOfServicePage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: settlements }, { data: employees }] = await Promise.all([
    supabase
      .from("end_of_service_settlements")
      .select<
        "id, employee_id, termination_date, years_of_service, gratuity_amount, calculation_notes",
        SettlementRow
      >("id, employee_id, termination_date, years_of_service, gratuity_amount, calculation_notes")
      .order("termination_date", { ascending: false }),
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
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "مكافأة نهاية الخدمة"]} />}
        title="مكافأة نهاية الخدمة"
        subtitle="احتساب مكافأة نهاية الخدمة عند إنهاء عقد موظف — صيغة تقديرية مبسّطة تحتاج مراجعة محاسب/مختص قانوني قبل الاعتماد النهائي"
        actions={
          <ModalTrigger label="+ احتساب مكافأة" title="احتساب مكافأة نهاية الخدمة">
            <ActionForm action={calculateEndOfServiceAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">الموظف</label>
                <Select name="employeeId" required>
                  <option value="">اختر موظفًا نشطًا</option>
                  {(employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">تاريخ انتهاء الخدمة</label>
                <Input name="terminationDate" type="date" required />
              </div>
              <p className="text-xs text-foreground/60">
                يوقف حساب الموظف تلقائيًا بعد الاحتساب (نصف شهر عن كل سنة من أول 5 سنوات، وشهر كامل عن كل سنة بعدها).
              </p>
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
                <th>تاريخ انتهاء الخدمة</th>
                <th>سنوات الخدمة</th>
                <th>قيمة المكافأة</th>
              </tr>
            </thead>
            <tbody>
              {(settlements ?? []).map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-2">{employeeNameById.get(s.employee_id) ?? "—"}</td>
                  <td>{s.termination_date}</td>
                  <td>{s.years_of_service}</td>
                  <td className="font-semibold">{s.gratuity_amount.toLocaleString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(settlements?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد تسويات بعد</p> : null}
      </Card>
    </div>
  );
}
