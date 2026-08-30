"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { NotificationsBell } from "./notifications-bell";
import type { NavItem } from "./admin-nav";
import { findModuleForPath, isModulePageVisible } from "../lib/modules";
import type { StaffRole } from "../lib/permissions";
import type { NotificationItem } from "../lib/notifications";

// الغلاف الذي يقرّر شكل لوحة التحكم حسب المسار الحالي:
// - "/" (صفحة المربّعات): بلا شريط جانبي، عرض كامل.
// - أي مسار داخل وحدة (راجع lib/modules.ts): شريط جانبي يعرض حصرًا صفحات
//   تلك الوحدة + رابط رجوع لكل الأقسام — بدل قائمة تنقّل مسطّحة واحدة تجمع
//   كل صفحات النظام.
export function ModuleShell({
  role,
  profileName,
  notifications,
  children,
}: {
  role: StaffRole | null;
  profileName?: string;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const isHub = pathname === "/";
  const mod = isHub ? null : findModuleForPath(pathname);

  const navItems: NavItem[] = isHub
    ? []
    : [
        { href: "/", label: "كل الأقسام", icon: "home" },
        ...(mod
          ? mod.pages
              .filter((p) => isModulePageVisible(p, role))
              .map((p) => ({ href: p.href, label: p.label, icon: p.icon }))
          : []),
      ];

  return (
    <div className="flex min-h-screen bg-muted/40">
      {isHub ? null : (
        <AdminSidebar
          navItems={navItems}
          settingsItems={[]}
          profileName={profileName}
          profileRole={role ?? "accountant"}
        />
      )}
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex justify-end">
            <NotificationsBell notifications={notifications} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
