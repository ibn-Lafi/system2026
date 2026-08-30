import { redirect } from "next/navigation";
import { Badge, Card, Input, ModalTrigger, PageHeader, Select, Textarea } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { createAppraisalAction } from "./actions";

type AppraisalRow = {
  id: string;
  employee_id: string;
  appraisal_period: string;
  score: number;
  strengths: string | null;
  areas_for_improvement: string | null;
};
type EmployeeOption = { id: string; full_name: string };

export default async function HrAppraisalsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: appraisals }, { data: employees }] = await Promise.all([
    supabase
      .from("performance_appraisals")
      .select<
        "id, employee_id, appraisal_period, score, strengths, areas_for_improvement",
        AppraisalRow
      >("id, employee_id, appraisal_period, score, strengths, areas_for_improvement")
      .order("appraisal_period", { ascending: false }),
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
        title="التقييم الوظيفي"
        actions={
          <ModalTrigger label="+ تسجيل تقييم" title="تسجيل تقييم وظيفي" size="lg">
            <ActionForm action={createAppraisalAction} className="space-y-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm">فترة التقييم</label>
                  <Input name="appraisalPeriod" placeholder="مثال: الربع الأول 2026" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الدرجة (من 100)</label>
                  <Input name="score" type="number" min={0} max={100} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm">نقاط القوة</label>
                <Textarea name="strengths" rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-sm">مجالات التحسين</label>
                <Textarea name="areasForImprovement" rows={2} />
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
                <th>الفترة</th>
                <th>الدرجة</th>
                <th>نقاط القوة</th>
                <th>مجالات التحسين</th>
              </tr>
            </thead>
            <tbody>
              {(appraisals ?? []).map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-2">{employeeNameById.get(a.employee_id) ?? "—"}</td>
                  <td>{a.appraisal_period}</td>
                  <td>
                    <Badge variant={a.score >= 70 ? "success" : a.score >= 50 ? "warning" : "danger"}>{a.score}</Badge>
                  </td>
                  <td className="max-w-xs truncate" title={a.strengths ?? ""}>
                    {a.strengths ?? "—"}
                  </td>
                  <td className="max-w-xs truncate" title={a.areas_for_improvement ?? ""}>
                    {a.areas_for_improvement ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(appraisals?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد تقييمات بعد</p> : null}
      </Card>
    </div>
  );
}
