import { Badge, Button, Card, Input, ModalTrigger, PageHeader, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import {
  ASSIGNABLE_STAFF_ROLES,
  DASHBOARD_ROLES,
  STAFF_ROLE_LABELS,
  hasPermission,
  type StaffRole,
} from "../../../../lib/permissions";
import { CreateUserForm } from "./create-user-form";
import { changeUserPasswordAction, changeUserRoleAction, toggleStaffUserActiveAction } from "./actions";

type StaffUser = { id: string; name: string; email: string | null; role: StaffRole; is_active: boolean };

export default async function UsersPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_settings");

  const { data: users } = await supabase
    .from("profiles")
    .select<"id, name, email, role, is_active", StaffUser>("id, name, email, role, is_active")
    .in("role", DASHBOARD_ROLES)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون"
        actions={
          canManage ? (
            <ModalTrigger label="+ إضافة مستخدم" title="إضافة مستخدم جديد">
              <CreateUserForm />
            </ModalTrigger>
          ) : null
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>الحالة</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-2">{u.name}</td>
                  <td dir="ltr">{u.email ?? "—"}</td>
                  <td>{STAFF_ROLE_LABELS[u.role]}</td>
                  <td>
                    <Badge variant={u.is_active ? "success" : "muted"}>
                      {u.is_active ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                  {canManage ? (
                    <td className="flex flex-wrap gap-2 py-2">
                      {u.role !== "admin" ? (
                        <form action={toggleStaffUserActiveAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="nextIsActive" value={(!u.is_active).toString()} />
                          <Button type="submit" variant="outline" size="sm">
                            {u.is_active ? "إيقاف" : "تفعيل"}
                          </Button>
                        </form>
                      ) : null}

                      {u.role !== "admin" ? (
                        <ModalTrigger label="تعديل" title={`تعديل: ${u.name}`} variant="outline" buttonSize="sm">
                          <div className="space-y-6">
                            <div>
                              <h3 className="mb-2 text-sm font-semibold">تغيير الدور</h3>
                              <ActionForm action={changeUserRoleAction} submitLabel="حفظ الدور">
                                <input type="hidden" name="userId" value={u.id} />
                                <Select name="role" defaultValue={u.role}>
                                  {ASSIGNABLE_STAFF_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {STAFF_ROLE_LABELS[r]}
                                    </option>
                                  ))}
                                </Select>
                              </ActionForm>
                            </div>
                            <div className="border-t border-border pt-4">
                              <h3 className="mb-2 text-sm font-semibold">تغيير كلمة المرور</h3>
                              <ActionForm action={changeUserPasswordAction} submitLabel="تحديث كلمة المرور">
                                <input type="hidden" name="userId" value={u.id} />
                                <Input
                                  name="password"
                                  type="password"
                                  minLength={6}
                                  placeholder="كلمة مرور جديدة"
                                  required
                                />
                              </ActionForm>
                            </div>
                          </div>
                        </ModalTrigger>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(users?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد مستخدمون بعد</p> : null}
      </Card>
    </div>
  );
}
