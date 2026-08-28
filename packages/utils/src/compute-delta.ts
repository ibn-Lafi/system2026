export type PercentDelta = { label: string; direction: "up" | "down" };

// نسبة التغيّر بين قيمتين (فترة حالية مقابل سابقة) لعرضها كشارة على بطاقات
// المؤشرات بصفحات الداشبورد/التقارير — بلا شارة إذا لا يوجد أساس مقارنة
// حقيقي (كلا القيمتين صفر).
export function computeDelta(current: number, previous: number): PercentDelta | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return { label: "جديد", direction: "up" };
  const pct = ((current - previous) / previous) * 100;
  return { label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, direction: pct >= 0 ? "up" : "down" };
}
