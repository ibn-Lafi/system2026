import type { createSupabaseServerClient } from "@system2026/database/server";
import { hasPermission, type StaffRole } from "./permissions";

export type NotificationItem = {
  id: string;
  message: string;
  href: string;
};

// نفس عتبة "كمية منخفضة" المعروضة بصفحة المخزون (راجع warehouse/page.tsx) —
// موحّدة هنا حتى لا يختلف رقمان لنفس المفهوم بمكانين من الواجهة.
const LOW_STOCK_THRESHOLD = 10;

// كل تنبيه محسوب مباشرة من البيانات الحالية (بدون جدول/تخزين تاريخي) —
// يُحسب من جديد بكل تحميل صفحة، ويُفلتر حسب صلاحية المستخدم الحالي، فيظهر
// فقط ما يخصّه (راجع طلب المستخدم: "التنبيه مرتبط بالأشياء المرتبطة لكل
// مستخدم"). الفرض الأمني الحقيقي يبقى RLS كالمعتاد — هذا الفلتر لتحسين
// الملاءمة (Relevance) فقط.
export async function getNotifications(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  role: StaffRole | null,
): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];
  const tasks: Promise<void>[] = [];

  if (hasPermission(role, "view_reports")) {
    tasks.push(
      (async () => {
        const { data: settings } = await supabase
          .from("system_settings")
          .select<"expiry_alert_days_threshold", { expiry_alert_days_threshold: number }>(
            "expiry_alert_days_threshold",
          )
          .eq("id", 1)
          .single();
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + (settings?.expiry_alert_days_threshold ?? 30));

        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("has_expiry", true)
          .lte("expiry_date", thresholdDate.toISOString().slice(0, 10));

        if (count) {
          notifications.push({
            id: "expiry",
            message: `${count} منتج قرب انتهاء الصلاحية`,
            href: "/reports",
          });
        }
      })(),
    );
  }

  if (hasPermission(role, "manage_collections")) {
    tasks.push(
      (async () => {
        const { count } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .in("status", ["unpaid", "partial"]);

        if (count) {
          notifications.push({
            id: "receivables",
            message: `${count} فاتورة عميل عليها مبلغ مستحق التحصيل`,
            href: "/invoices",
          });
        }
      })(),
    );
  }

  if (hasPermission(role, "manage_purchases")) {
    tasks.push(
      (async () => {
        const { count } = await supabase
          .from("purchase_invoices")
          .select("id", { count: "exact", head: true })
          .in("payment_status", ["unpaid", "partial"]);

        if (count) {
          notifications.push({
            id: "payables",
            message: `${count} فاتورة شراء عليها مستحق للمورد`,
            href: "/suppliers",
          });
        }
      })(),
    );
  }

  if (hasPermission(role, "manage_warehouse")) {
    tasks.push(
      (async () => {
        const { count } = await supabase
          .from("warehouse_stock")
          .select("product_id", { count: "exact", head: true })
          .lt("quantity_available", LOW_STOCK_THRESHOLD);

        if (count) {
          notifications.push({
            id: "low_stock",
            message: `${count} منتج بكمية منخفضة أو نافدة بالمخزون`,
            href: "/warehouse",
          });
        }
      })(),
    );
  }

  if (hasPermission(role, "manage_hr")) {
    tasks.push(
      (async () => {
        const { count } = await supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");

        if (count) {
          notifications.push({
            id: "leave_requests",
            message: `${count} طلب إجازة بانتظار المراجعة`,
            href: "/hr/leaves",
          });
        }
      })(),
    );
    tasks.push(
      (async () => {
        const { count } = await supabase
          .from("employee_advances")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");

        if (count) {
          notifications.push({
            id: "advances",
            message: `${count} طلب سلفة بانتظار المراجعة`,
            href: "/hr/advances",
          });
        }
      })(),
    );
  }

  await Promise.all(tasks);
  return notifications;
}
