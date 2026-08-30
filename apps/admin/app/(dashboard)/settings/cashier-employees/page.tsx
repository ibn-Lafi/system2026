import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import {
  createCashierEmployeeAction,
  resetCashierEmployeePinAction,
  setCashierEmployeeActiveAction,
} from "./actions";

type EmployeeRow = { id: string; name: string; is_active: boolean; created_at: string };

export default async function CashierEmployeesPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: employees } = await supabase
    .from("cashier_employees")
    .select<"id, name, is_active, created_at", EmployeeRow>("id, name, is_active, created_at")
    .order("created_at");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الإعدادات", "موظفو الكاشير"]} />}
        title="موظفو الكاشير"
        subtitle="كل موظف له رمز PIN خاص به — عند فتح تطبيق الكاشير يختار اسمه ويدخل رقمه، وتُنسب له كل عملية بيع"
        actions={
          <ModalTrigger label="+ إضافة موظف" title="إضافة موظف كاشير">
            <ActionForm action={createCashierEmployeeAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">اسم الموظف</label>
                <Input name="name" placeholder="مثال: أحمد الغامدي" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">رمز PIN (4 إلى 6 أرقام)</label>
                <Input name="pin" dir="ltr" inputMode="numeric" pattern="[0-9]{4,6}" required />
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
                <th className="py-2">الاسم</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-2">{e.name}</td>
                  <td>
                    {e.is_active ? <Badge variant="success">نشط</Badge> : <Badge variant="muted">معطّل</Badge>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <ModalTrigger label="تغيير PIN" title={`تغيير PIN — ${e.name}`} variant="outline" buttonSize="sm">
                        <ActionForm action={resetCashierEmployeePinAction} className="space-y-3">
                          <input type="hidden" name="employeeId" value={e.id} />
                          <div>
                            <label className="mb-1 block text-sm">رمز PIN الجديد</label>
                            <Input name="pin" dir="ltr" inputMode="numeric" pattern="[0-9]{4,6}" required />
                          </div>
                        </ActionForm>
                      </ModalTrigger>
                      <form action={setCashierEmployeeActiveAction}>
                        <input type="hidden" name="employeeId" value={e.id} />
                        <input type="hidden" name="isActive" value={(!e.is_active).toString()} />
                        <Button type="submit" size="sm" variant={e.is_active ? "destructive" : "outline"}>
                          {e.is_active ? "تعطيل" : "تفعيل"}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(employees?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد موظفو كاشير بعد</p> : null}
      </Card>
    </div>
  );
}
