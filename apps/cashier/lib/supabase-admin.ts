import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@system2026/database";

// service_role key — لا يُستخدم إلا هنا (Server Action)، ولا يُمرَّر أبدًا
// للفرونت إند أو المتصفح. راجع CLAUDE.md §4.4.
//
// تطبيق الكاشير بلا جلسة Supabase Auth إطلاقًا (دخول برمز PIN مشترك للجهاز،
// راجع lib/session.ts) — كل العمليات تمر عبر هذا العميل بصلاحيات مرتفعة،
// وخط الدفاع الحقيقي هو تحقق جلسة الـPIN بمنتصف middleware.ts + RPCs مخصّصة
// (create_cashier_sale/find_or_create_customer_by_phone) لا تثق بأي مدخل من
// الفرونت إند غير مُعاد التحقق منه بقاعدة البيانات (راجع CLAUDE.md §5.3 بند 3).
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
