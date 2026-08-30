"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { NotificationsBell } from "./notifications-bell";
import { PersonIcon, ArrowRightIcon } from "./icons";
import type { NavItem } from "./admin-nav";
import { findModuleForPath, isModulePageVisible } from "../lib/modules";
import type { StaffRole } from "../lib/permissions";
import type { NotificationItem } from "../lib/notifications";

// تحسب بعد التحميل بالمتصفح (لا بالسيرفر) لتفادي فرق التوقيت/المنطقة
// الزمنية بين عرض السيرفر والعميل — قبل التحميل تُعرض فارغة لحظيًا.
function useGreeting(): string | null {
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    setGreeting(new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير");
  }, []);
  return greeting;
}

// الغلاف الذي يقرّر شكل لوحة التحكم حسب المسار الحالي:
// - "/" (صفحة المربّعات): بلا شريط جانبي، عرض كامل، مع تحية بمنتصف الرأس.
// - وحدة noSidebar (راجع lib/modules.ts، مثل التقارير): بلا شريط جانبي
//   أيضًا — صفحة واحدة مستقلة تُفتح مباشرة من مربّعها بالرئيسية.
// - أي وحدة أخرى: شريط جانبي يعرض حصرًا صفحات تلك الوحدة — الرجوع لكل
//   الأقسام صار زر سهم أعلى الصفحة بجانب أيقونة الحساب، وليس عنصر شريط.
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
  const showSidebar = !isHub && !mod?.noSidebar;
  const greeting = useGreeting();

  const navItems: NavItem[] = showSidebar && mod
    ? mod.pages.filter((p) => isModulePageVisible(p, role)).map((p) => ({ href: p.href, label: p.label, icon: p.icon }))
    : [];

  return (
    <div className="flex min-h-screen bg-muted/40">
      {showSidebar ? <AdminSidebar navItems={navItems} settingsItems={[]} /> : null}
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="flex items-center gap-1">
              {isHub ? null : (
                <Link
                  href="/"
                  aria-label="كل الأقسام"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              )}
              <Link
                href="/account"
                aria-label="حسابي"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              >
                <PersonIcon className="h-5 w-5" />
              </Link>
            </div>
            <p className="truncate text-center text-sm font-medium text-foreground/70">
              {isHub && greeting ? `${greeting}${profileName ? `، ${profileName}` : ""}` : ""}
            </p>
            <NotificationsBell notifications={notifications} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
