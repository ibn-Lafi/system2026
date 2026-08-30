import { redirect } from "next/navigation";
import { Badge, Card, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { createEmployeeAction, updateEmployeeAction } from "./actions";

type EmployeeRow = {
  id: string;
  full_name: string;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  job_title: string | null;
  department: string | null;
  hire_date: string;
  shift_id: string | null;
  basic_salary: number;
  housing_allowance: number;
  other_allowances: number;
  is_active: boolean;
};

type ShiftRow = { id: string; name: string };

function EmployeeFormFields({ shifts, defaults }: { shifts: ShiftRow[]; defaults?: Partial<EmployeeRow> }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm">الاسم الكامل</label>
        <Input name="fullName" defaultValue={defaults?.full_name ?? ""} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm">رقم الهوية</label>
          <Input name="nationalId" dir="ltr" defaultValue={defaults?.national_id ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm">الجوال</label>
          <Input name="phone" dir="ltr" defaultValue={defaults?.phone ?? ""} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">البريد الإلكتروني</label>
        <Input name="email" type="email" dir="ltr" defaultValue={defaults?.email ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm">المسمى الوظيفي</label>
          <Input name="jobTitle" defaultValue={defaults?.job_title ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm">القسم</label>
          <Input name="department" defaultValue={defaults?.department ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm">تاريخ التعيين</label>
          <Input name="hireDate" type="date" defaultValue={defaults?.hire_date ?? ""} required />
        </div>
        <div>
          <label className="mb-1 block text-sm">الوردية</label>
          <Select name="shiftId" defaultValue={defaults?.shift_id ?? ""}>
            <option value="">بدون وردية</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm">الراتب الأساسي</label>
          <Input name="basicSalary" type="number" step="0.01" min="0" defaultValue={defaults?.basic_salary ?? 0} required />
        </div>
        <div>
          <label className="mb-1 block text-sm">بدل سكن</label>
          <Input name="housingAllowance" type="number" step="0.01" min="0" defaultValue={defaults?.housing_allowance ?? 0} />
        </div>
        <div>
          <label className="mb-1 block text-sm">بدلات أخرى</label>
          <Input name="otherAllowances" type="number" step="0.01" min="0" defaultValue={defaults?.other_allowances ?? 0} />
        </div>
      </div>
    </>
  );
}

export default async function HrEmployeesPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: employees }, { data: shifts }] = await Promise.all([
    supabase
      .from("employees")
      .select<
        "id, full_name, national_id, phone, email, job_title, department, hire_date, shift_id, basic_salary, housing_allowance, other_allowances, is_active",
        EmployeeRow
      >(
        "id, full_name, national_id, phone, email, job_title, department, hire_date, shift_id, basic_salary, housing_allowance, other_allowances, is_active",
      )
      .order("full_name"),
    supabase.from("shifts").select<"id, name", ShiftRow>("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "الموظفون"]} />}
        title="الموظفون"
        subtitle="بيانات الموظفين والرواتب الأساسية"
        actions={
          <ModalTrigger label="+ إضافة موظف" title="إضافة موظف جديد" size="lg">
            <ActionForm action={createEmployeeAction} className="space-y-3">
              <EmployeeFormFields shifts={shifts ?? []} />
            </ActionForm>
          </ModalTrigger>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>المسمى</th>
                <th>الجوال</th>
                <th>تاريخ التعيين</th>
                <th>الراتب الإجمالي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-2">{e.full_name}</td>
                  <td>{e.job_title ?? "—"}</td>
                  <td dir="ltr">{e.phone ?? "—"}</td>
                  <td>{e.hire_date}</td>
                  <td>{(e.basic_salary + e.housing_allowance + e.other_allowances).toLocaleString("ar-SA")}</td>
                  <td>
                    {e.is_active ? (
                      <Badge variant="success">نشط</Badge>
                    ) : (
                      <Badge variant="muted">غير نشط</Badge>
                    )}
                  </td>
                  <td>
                    <ModalTrigger label="تعديل" title={`تعديل بيانات ${e.full_name}`} variant="outline" buttonSize="sm" size="lg">
                      <ActionForm action={updateEmployeeAction} className="space-y-3">
                        <input type="hidden" name="id" value={e.id} />
                        <EmployeeFormFields shifts={shifts ?? []} defaults={e} />
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="isActive" defaultChecked={e.is_active} />
                          موظف نشط
                        </label>
                      </ActionForm>
                    </ModalTrigger>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(employees?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد موظفون بعد</p> : null}
      </Card>
    </div>
  );
}
