// خريطة الأدوار → الصلاحيات — يجب أن تطابق تمامًا دالة auth_has_permission()
// بقاعدة البيانات (راجع migration 20260815090000_staff_roles_and_permissions.sql).
// هذا الملف يخدم مستوى واحد فقط: إخفاء/إظهار عناصر الواجهة (راجع CLAUDE.md
// §5.3) — الفرض الفعلي للصلاحية يتم بـ RLS/RPC على قاعدة البيانات، لا هنا.

export type StaffRole =
  | "admin"
  | "accountant"
  | "rep"
  | "marketing"
  | "sales"
  | "production"
  | "supervisor";

export type Permission =
  | "manage_products"
  | "manage_warehouse"
  | "manage_purchases"
  | "manage_customers"
  | "manage_collections"
  | "manage_returns"
  | "manage_invoice_requests"
  | "manage_settings"
  | "view_reports";

const ROLE_PERMISSIONS: Record<Exclude<StaffRole, "admin" | "rep">, Permission[]> = {
  accountant: ["view_reports", "manage_collections"],
  marketing: ["manage_products", "view_reports"],
  sales: ["manage_customers", "manage_collections", "manage_returns", "view_reports"],
  production: ["manage_products", "manage_purchases", "manage_warehouse", "view_reports"],
  supervisor: ["view_reports", "manage_invoice_requests", "manage_returns"],
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "مدير",
  accountant: "المحاسبة",
  marketing: "التسويق",
  sales: "المبيعات",
  production: "الإنتاج",
  supervisor: "مشرف",
  rep: "مندوب",
};

// الأدوار القابلة للإضافة من صفحة إدارة المستخدمين (بترتيب معتمد) — لا يشمل
// "rep" (تطبيق المندوب مُزال من النظام؛ الدور يبقى بقاعدة البيانات لسجلات
// تاريخية فقط) ولا "admin" (لا يُنشأ أدمن آخر من الواجهة تفاديًا لتوسيع
// دائرة الصلاحية الكاملة بلا رقابة).
export const ASSIGNABLE_STAFF_ROLES: StaffRole[] = [
  "accountant",
  "marketing",
  "sales",
  "production",
  "supervisor",
];

// الأدوار المسموح لها بدخول لوحة التحكم (accountant + admin + الأدوار
// الجديدة) — rep له تطبيقه المستقل ولا يدخل هذا التطبيق إطلاقًا.
export const DASHBOARD_ROLES: StaffRole[] = ["admin", ...ASSIGNABLE_STAFF_ROLES];

export function hasPermission(role: StaffRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  if (role === "rep") return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: StaffRole): Permission[] {
  if (role === "admin") {
    return [
      "manage_products",
      "manage_warehouse",
      "manage_purchases",
      "manage_customers",
      "manage_collections",
      "manage_returns",
      "manage_invoice_requests",
      "manage_settings",
      "view_reports",
    ];
  }
  if (role === "rep") return [];
  return ROLE_PERMISSIONS[role];
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_products: "إدارة المنتجات والفئات",
  manage_warehouse: "تعديل كميات المخزون",
  manage_purchases: "إدارة الموردين وفواتير الشراء",
  manage_customers: "إدارة العملاء",
  manage_collections: "تسجيل التحصيلات",
  manage_returns: "تسجيل المرتجعات",
  manage_invoice_requests: "مراجعة طلبات تعديل الفواتير",
  manage_settings: "إدارة المستخدمين وإعدادات النظام",
  view_reports: "عرض التقارير",
};
