import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AdminSidebar } from "../../components/admin-sidebar";
import type { IconName } from "../../components/admin-nav";
import { hasPermission, type Permission, type StaffRole } from "../../lib/permissions";

// ملاحظة: icon هنا اسم (string) وليس دالة React — مكوّنات الأيقونات لا يمكن
// تمريرها كـ props من Server Component (هذا الملف) لـ Client Component
// (AdminSidebar/AdminNav)، فالربط الفعلي بين الاسم والمكوّن يتم داخل
// admin-nav.tsx (ICON_MAP) على جانب العميل.
//
// permission: أي صلاحية من هذي القائمة تكفي لإظهار العنصر (OR)؛ بدونها =
// يظهر للجميع (مثل الرئيسية). هذا إخفاء واجهة فقط — الفرض الفعلي بـ RLS
// (راجع apps/admin/lib/permissions.ts).
type NavItemDef = { href: string; label: string; icon: IconName; permissions?: Permission[] };

const NAV_ITEMS: NavItemDef[] = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/products", label: "المنتجات", icon: "box", permissions: ["manage_products"] },
  { href: "/suppliers", label: "الموردين", icon: "truck", permissions: ["manage_purchases"] },
  { href: "/warehouse", label: "المخزون", icon: "warehouse", permissions: ["manage_warehouse"] },
  { href: "/customers", label: "العملاء", icon: "store", permissions: ["manage_customers"] },
  {
    href: "/invoices",
    label: "الفواتير",
    icon: "invoice",
    permissions: ["manage_collections", "manage_returns", "manage_invoice_requests"],
  },
  { href: "/reports", label: "التقارير", icon: "chart", permissions: ["view_reports"] },
  { href: "/hr", label: "الموارد البشرية", icon: "hr", permissions: ["manage_hr"] },
  { href: "/store", label: "المتجر الإلكتروني", icon: "cart", permissions: ["manage_settings"] },
];

const SETTINGS_ITEMS: NavItemDef[] = [
  { href: "/settings", label: "الإعدادات", icon: "settings", permissions: ["manage_settings"] },
];

function isVisible(item: NavItemDef, role: StaffRole | null) {
  if (!item.permissions || item.permissions.length === 0) return true;
  return item.permissions.some((p) => hasPermission(role, p));
}

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
  const visibleNavItems = NAV_ITEMS.filter((item) => isVisible(item, role)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );
  const visibleSettingsItems = SETTINGS_ITEMS.filter((item) => isVisible(item, role)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AdminSidebar
        navItems={visibleNavItems}
        settingsItems={visibleSettingsItems}
        profileName={profile?.name}
        profileRole={role ?? "accountant"}
      />
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
