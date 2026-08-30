"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { NotificationsBell } from "./notifications-bell";
import { PersonIcon } from "./icons";
import type { NavItem } from "./admin-nav";
import { findModuleForPath, isModulePageVisible } from "../lib/modules";
import type { StaffRole } from "../lib/permissions";
import type { NotificationItem } from "../lib/notifications";

// الغلاف الذي يقرّر شكل لوحة التحكم حسب المسار الحالي:
// - "/" (صفحة المربّعات): بلا شريط جانبي، عرض كامل.
// - وحدة noSidebar (راجع lib/modules.ts، مثل التقارير): بلا شريط جانبي
//   أيضًا — صفحة واحدة مستقلة تُفتح مباشرة من مربّعها بالرئيسية.
// - أي وحدة أخرى: شريط جانبي يعرض حصرًا صفحات تلك الوحدة + رابط رجوع لكل
//   الأقسام — بدل قائمة تنقّل مسطّحة واحدة تجمع كل صفحات النظام.
export function ModuleShell({
  role,
  notifications,
  children,
}: {
  role: StaffRole | null;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const isHub = pathname === "/";
  const mod = isHub ? null : findModuleForPath(pathname);
  const showSidebar = !isHub && !mod?.noSidebar;

  const navItems: NavItem[] = showSidebar
    ? [
        { href: "/", label: "كل الأقسام", icon: "home" },
        ...(mod
          ? mod.pages
              .filter((p) => isModulePageVisible(p, role))
              .map((p) => ({ href: p.href, label: p.label, icon: p.icon }))
          : []),
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-muted/40">
      {showSidebar ? <AdminSidebar navItems={navItems} settingsItems={[]} /> : null}
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/account"
              aria-label="حسابي"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <PersonIcon className="h-5 w-5" />
            </Link>
            <NotificationsBell notifications={notifications} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
