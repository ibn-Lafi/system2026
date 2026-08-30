"use client";

import Link from "next/link";
import { Card } from "@system2026/ui";
import { ICON_MAP, type IconName } from "./admin-nav";

// مكوّن جانب العميل لأن ICON_MAP يحمل مراجع دوال React (مكوّنات الأيقونات)
// لا يمكن تمريرها/استخدامها من Server Component مباشرة — راجع نفس الملاحظة
// بـadmin-nav.tsx. الصفحة الرئيسية (Server Component) تمرّر فقط اسم الأيقونة
// (نص) لكل مربّع، والربط الفعلي بالمكوّن يتم هنا.
export function ModuleTile({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: IconName;
  label: string;
  description: string;
}) {
  const Icon = ICON_MAP[icon];
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:bg-muted/60">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="mt-3 font-semibold">{label}</h2>
        <p className="mt-1 text-sm text-foreground/60">{description}</p>
      </Card>
    </Link>
  );
}
