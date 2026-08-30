import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, PageHeader } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { PERMISSION_LABELS, STAFF_ROLE_LABELS, permissionsForRole, type StaffRole } from "../../../lib/permissions";
import { updateOwnNameAction, updateOwnPasswordAction, signOutAction } from "./actions";

type Profile = { name: string; email: string | null; role: StaffRole };

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select<"name, email, role", Profile>("name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحساب الشخصي"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">بياناتي</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-foreground/60">البريد الإلكتروني: </span>
              <span dir="ltr">{profile.email}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-foreground/60">الدور: </span>
              <Badge>{STAFF_ROLE_LABELS[profile.role]}</Badge>
            </p>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold">صلاحياتي</h3>
          {permissionsForRole(profile.role).length > 0 ? (
            <ul className="space-y-1 text-sm">
              {permissionsForRole(profile.role).map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="text-primary">✓</span> {PERMISSION_LABELS[p]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60">لا توجد صلاحيات لوحة تحكم إضافية</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">تعديل الاسم</h2>
            <ActionForm action={updateOwnNameAction} submitLabel="حفظ الاسم">
              <Input name="name" defaultValue={profile.name} required />
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">تغيير كلمة المرور</h2>
            <ActionForm action={updateOwnPasswordAction} submitLabel="تحديث كلمة المرور">
              <Input name="password" type="password" minLength={6} placeholder="كلمة مرور جديدة" required />
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold">تسجيل الخروج</h2>
            <p className="mb-3 text-sm text-foreground/60">سيتم إنهاء جلستك الحالية وتحويلك لصفحة تسجيل الدخول</p>
            <form action={signOutAction}>
              <Button type="submit" variant="destructive" className="w-full">
                تسجيل خروج
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
