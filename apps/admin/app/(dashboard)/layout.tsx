import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ModuleShell } from "../../components/module-shell";
import type { StaffRole } from "../../lib/permissions";
import { getNotifications } from "../../lib/notifications";

// بناء الشريط الجانبي (سياقي حسب الوحدة الحالية — راجع lib/modules.ts) يتم
// على جانب العميل بـModuleShell (يحتاج usePathname). هذا الملف يتكفّل فقط
// بالتحقق من الجلسة وجلب البيانات اللازمة (الدور، الاسم، التنبيهات).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select<"name, role", { name: string; role: StaffRole }>("name, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? null;
  const notifications = await getNotifications(supabase, role);

  return (
    <ModuleShell role={role} profileName={profile?.name} notifications={notifications}>
      {children}
    </ModuleShell>
  );
}
