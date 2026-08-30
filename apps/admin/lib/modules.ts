import type { IconName } from "../components/admin-nav";
import { hasPermission, type Permission, type StaffRole } from "./permissions";

// وحدة التنقّل الرئيسية بعد تسجيل الدخول: صفحة مربّعات (/) لكل قسم كبير من
// النظام، وعند الدخول لمربّع يظهر نفس شكل لوحة التحكم المعتاد (شريط جانبي +
// محتوى) لكن الشريط الجانبي يعرض فقط صفحات ذاك القسم — بدل قائمة تنقّل واحدة
// مسطّحة تجمع كل شيء. هذا الملف هو المصدر الوحيد لهذا التقسيم (يُستخدم من
// صفحة المربّعات ومن layout.tsx لبناء الشريط الجانبي السياقي).
export type ModulePage = { href: string; label: string; icon: IconName; permissions?: Permission[] };

export type ModuleDef = {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  pages: ModulePage[];
  // مسارات إضافية (صفحات تفاصيل تُفتح من رابط لا من الشريط الجانبي، مثل
  // /purchases/[id]) تنتمي لهذي الوحدة لأغراض تحديد الوحدة الحالية فقط —
  // لا تُعرض كعنصر شريط جانبي مستقل.
  extraPathPrefixes?: string[];
};

export const MODULES: ModuleDef[] = [
  {
    key: "website",
    label: "الموقع الإلكتروني",
    description: "المتجر العام: الهوية، المحتوى، والتصميم",
    icon: "cart",
    pages: [
      { href: "/store", label: "المتجر الإلكتروني", icon: "cart", permissions: ["manage_settings"] },
      { href: "/store/theme", label: "تصميم المتجر", icon: "settings", permissions: ["manage_settings"] },
    ],
  },
  {
    key: "sales",
    label: "المبيعات",
    description: "العملاء، الفواتير، والمرتجعات",
    icon: "invoice",
    pages: [
      { href: "/sales", label: "نظرة عامة", icon: "chart", permissions: ["view_reports"] },
      { href: "/customers", label: "العملاء", icon: "store", permissions: ["manage_customers"] },
      { href: "/invoices", label: "الفواتير", icon: "invoice", permissions: ["manage_collections", "manage_returns"] },
      { href: "/returns", label: "المرتجعات", icon: "return", permissions: ["manage_returns"] },
      { href: "/reports", label: "التقارير", icon: "chart", permissions: ["view_reports"] },
    ],
  },
  {
    key: "operations",
    label: "التشغيل",
    description: "المخزون، الموردون، والمشتريات",
    icon: "warehouse",
    pages: [
      { href: "/operations", label: "نظرة عامة", icon: "warehouse" },
      { href: "/warehouse", label: "المخزون", icon: "warehouse", permissions: ["manage_warehouse"] },
      { href: "/suppliers", label: "الموردين والمشتريات", icon: "truck", permissions: ["manage_purchases"] },
    ],
    extraPathPrefixes: ["/purchases"],
  },
  {
    key: "marketing",
    label: "التسويق",
    description: "المنتجات وكتالوج المتجر، وبيانات الزوار المهتمين",
    icon: "chart",
    pages: [
      { href: "/marketing", label: "نظرة عامة", icon: "chart" },
      { href: "/products", label: "المنتجات", icon: "box", permissions: ["manage_products"] },
      { href: "/store/leads", label: "بيانات الزوار", icon: "users", permissions: ["manage_settings"] },
    ],
  },
  {
    key: "hr",
    label: "الموارد البشرية",
    description: "الموظفون، الحضور، الإجازات، والرواتب",
    icon: "hr",
    pages: [
      { href: "/hr", label: "نظرة عامة", icon: "hr", permissions: ["manage_hr"] },
      { href: "/hr/employees", label: "الموظفون", icon: "users", permissions: ["manage_hr"] },
      { href: "/hr/attendance", label: "الحضور", icon: "edit", permissions: ["manage_hr"] },
      { href: "/hr/leaves", label: "الإجازات", icon: "invoice", permissions: ["manage_hr"] },
      { href: "/hr/leave-balances", label: "أرصدة الإجازات", icon: "chart", permissions: ["manage_hr"] },
      { href: "/hr/shifts", label: "الورديات والبصمة", icon: "transfer", permissions: ["manage_hr"] },
      { href: "/hr/payroll", label: "مسير الرواتب", icon: "wallet", permissions: ["manage_hr"] },
      { href: "/hr/advances", label: "السلف والعهد", icon: "creditCard", permissions: ["manage_hr"] },
      { href: "/hr/payroll-payments", label: "صرف الأجور", icon: "wallet", permissions: ["manage_hr"] },
      { href: "/hr/end-of-service", label: "مكافأة نهاية الخدمة", icon: "box", permissions: ["manage_hr"] },
      { href: "/hr/appraisals", label: "التقييم الوظيفي", icon: "edit", permissions: ["manage_hr"] },
      { href: "/hr/me", label: "بياناتي", icon: "users", permissions: ["manage_hr"] },
    ],
  },
  {
    key: "manufacturing",
    label: "التصنيع",
    description: "لا توجد ميزات تصنيع مُفعّلة بالنظام بعد",
    icon: "box",
    pages: [{ href: "/manufacturing", label: "نظرة عامة", icon: "box" }],
  },
  {
    key: "settings",
    label: "الإعدادات",
    description: "بيانات الشركة، المستخدمون، وإعدادات النظام",
    icon: "settings",
    pages: [
      { href: "/settings", label: "الإعدادات العامة", icon: "settings", permissions: ["manage_settings"] },
      { href: "/settings/users", label: "المستخدمون", icon: "users", permissions: ["manage_settings"] },
    ],
  },
];

export function isModulePageVisible(page: ModulePage, role: StaffRole | null): boolean {
  if (!page.permissions || page.permissions.length === 0) return true;
  return page.permissions.some((p) => hasPermission(role, p));
}

// أول صفحة من الوحدة يملك المستخدم صلاحية الوصول لها — هي وجهة المربّع
// بصفحة المربّعات الرئيسية. null يعني لا صلاحية لأي صفحة بهذي الوحدة (تُخفى
// كاملة عن صفحة المربّعات).
export function getModuleTileHref(mod: ModuleDef, role: StaffRole | null): string | null {
  return mod.pages.find((p) => isModulePageVisible(p, role))?.href ?? null;
}

// الوحدة التي ينتمي لها المسار الحالي (أطول href مطابق) — تُستخدم بـlayout.tsx
// لبناء الشريط الجانبي السياقي. "/" نفسها ليست ضمن أي وحدة (صفحة المربّعات).
export function findModuleForPath(pathname: string): ModuleDef | null {
  let bestMod: ModuleDef | null = null;
  let bestLen = -1;

  function matches(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  for (const mod of MODULES) {
    const hrefs = [...mod.pages.map((p) => p.href), ...(mod.extraPathPrefixes ?? [])];
    for (const href of hrefs) {
      if (matches(href) && href.length > bestLen) {
        bestMod = mod;
        bestLen = href.length;
      }
    }
  }

  return bestMod;
}
