import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "./cn";

export type MetricDelta = { label: string; direction: "up" | "down" };

// بطاقة مؤشر موحّدة لكل صفحات الداشبورد/الإحصائيات/التقارير: عنوان صغير،
// قيمة كبيرة، شارة تغيّر اختيارية (مقارنة بفترة سابقة)، وخط مصغّر (sparkline)
// اختياري لاتجاه آخر أيام. لا تُعرَض الشارة أو الـ sparkline إلا إذا وُجدت
// بيانات حقيقية لحسابها — لا قيم زخرفية وهمية.
export function MetricCard({
  label,
  value,
  delta,
  sparkline,
  footer,
  className,
}: {
  label: string;
  value: string;
  delta?: MetricDelta;
  sparkline?: number[];
  footer?: ReactNode;
  className?: string;
}) {
  const max = sparkline && sparkline.length > 0 ? Math.max(...sparkline, 1) : 1;

  return (
    <Card className={cn("transition-shadow hover:shadow-card-hover", className)}>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {delta ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              delta.direction === "up" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
            )}
          >
            {delta.label}
          </span>
        ) : null}
      </div>
      {sparkline && sparkline.length > 0 ? (
        <div className="mt-4 flex h-10 items-end gap-1">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-muted"
              style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
            />
          ))}
        </div>
      ) : null}
      {footer ? <div className="mt-1">{footer}</div> : null}
    </Card>
  );
}
