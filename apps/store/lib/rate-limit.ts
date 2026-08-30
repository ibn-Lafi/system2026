import "server-only";

// تحديد معدّل بسيط بالذاكرة لمسارات الكتابة العامة الجديدة (تحديد
// العميل/تأكيد الطلب) — راجع CLAUDE.md §5.7. تبسيط متعمّد: يعمل لكل نسخة
// خادم منفردة فقط (لا يشارك الحالة بين عدة instances) — كافٍ لحجم النشر
// الحالي، ويحتاج بديلًا مركزيًا (Redis/Edge Function) لو زاد عدد الخوادم.
const attemptsByKey = new Map<string, number[]>();

export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const attempts = (attemptsByKey.get(key) ?? []).filter((t) => now - t < windowMs);

  if (attempts.length >= maxAttempts) {
    attemptsByKey.set(key, attempts);
    return true;
  }

  attempts.push(now);
  attemptsByKey.set(key, attempts);
  return false;
}
