import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@system2026/database";

// service_role key — لا يُستخدم إلا هنا (Server Action)، ولا يُمرَّر أبدًا
// للفرونت إند أو المتصفح. راجع CLAUDE.md §4.4.
//
// زوار المتجر بلا جلسة Supabase Auth إطلاقًا (تعريف برقم الجوال فقط، راجع
// find_or_create_customer_by_phone) — خط الدفاع هنا هو إعادة التحقق الكامل
// من الأسعار/المخزون داخل create_online_store_order نفسها (لا تثق بأي مدخل
// غير مُعاد التحقق منه من قاعدة البيانات) + تحديد معدّل placeOrderAction
// (راجع lib/rate-limit.ts)، وليس RLS — راجع CLAUDE.md §5.3 بند 3.
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
