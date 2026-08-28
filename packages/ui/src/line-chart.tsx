export type LineChartSeries = { label: string; color: string; values: number[] };

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 180;
const PADDING_Y = 12;

function buildPoints(values: number[], max: number): string {
  if (values.length === 0) return "";
  const stepX = values.length > 1 ? VIEW_WIDTH / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = VIEW_HEIGHT - PADDING_Y - (v / max) * (VIEW_HEIGHT - PADDING_Y * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

// مخطط خطي بسلاسل متعددة (SVG خالص، بلا مكتبة رسم) — يُستخدم لعرض اتجاه
// مقياس عبر أيام/فترات متتالية بكل صفحات الداشبورد/التقارير. مفروض LTR
// دائمًا (كالتقويم) لأن ترتيب النقاط بصريًا من اليسار لليمين بغض النظر عن
// اتجاه الصفحة.
export function LineChart({ series, xLabels }: { series: LineChartSeries[]; xLabels: string[] }) {
  const max = Math.max(...series.flatMap((s) => s.values), 1);

  return (
    <div dir="ltr">
      {series.length > 1 ? (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="mt-4 h-48 w-full text-muted" preserveAspectRatio="none">
        <line x1="0" y1={VIEW_HEIGHT * 0.25} x2={VIEW_WIDTH} y2={VIEW_HEIGHT * 0.25} stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1={VIEW_HEIGHT * 0.5} x2={VIEW_WIDTH} y2={VIEW_HEIGHT * 0.5} stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1={VIEW_HEIGHT * 0.75} x2={VIEW_WIDTH} y2={VIEW_HEIGHT * 0.75} stroke="currentColor" strokeWidth="1" />
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={buildPoints(s.values, max)}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
        {xLabels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}
