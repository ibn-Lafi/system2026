export type StackedBarSegment = { label: string; value: number; color: string };

// لوحة تصنيفية محقَّقة الأمان اللوني (CVD Delta E >= 8، تباين طبيعي >= 15) —
// أول 4 شرائح من اللوحة المرجعية بمهارة dataviz، بترتيب ثابت لا يجوز كسره.
export const CHART_CATEGORICAL_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;

// شريط واحد مقسّم لأجزاء متناسبة (Part-to-whole) — بدل الدائرة النسبية
// (Donut/Pie) التي تصعب مقارنة قيمها المتقاربة بصريًا. فجوة 2px بلون السطح
// تفصل كل جزء، وألوان الفئات من لوحة مصنّفة (Categorical) محقَّقة الأمان
// اللوني (راجع مهارة dataviz)، والقيم موضوعة بمفتاح (Legend) أسفل الشريط
// بدل تسميات داخلية قد لا تتّسع.
export function StackedBarChart({ segments }: { segments: StackedBarSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div dir="ltr">
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md">
        {visible.map((s) => (
          <div
            key={s.label}
            className="h-full"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value} (${((s.value / total) * 100).toFixed(0)}%)`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {visible.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="text-muted-foreground">
              {s.value} ({((s.value / total) * 100).toFixed(0)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
