export type HorizontalBarItem = { label: string; value: number; displayValue?: string };

// مخطط شريطي أفقي مرتّب — لمقارنة مقدار (Magnitude) بين فئات (منتجات، أمنيات...):
// لون واحد فقط (لا حاجة لتصنيف لوني لأن السلسلة واحدة)، طرف الشريط مدوّر
// (4px) والقاعدة مربّعة، والقيمة موضوعة عند طرف الشريط مباشرة (Direct label).
export function HorizontalBarChart({ items }: { items: HorizontalBarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div dir="ltr" className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm font-medium text-foreground sm:w-40" title={item.label}>
            {item.label}
          </span>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-e-sm bg-primary transition-[width] duration-300"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-sm text-muted-foreground">{item.displayValue ?? item.value}</span>
        </div>
      ))}
    </div>
  );
}
