import Link from "next/link";
import { cn } from "./cn";

export type RangeChipItem = { label: string; href: string; active: boolean };

// مجموعة أزرار فترة زمنية داخل حاوية واحدة (segmented control) — تُستخدم
// بكل صفحات الداشبورد/التقارير بدل روابط منفصلة متفرقة.
export function RangeChips({ items, className }: { items: RangeChipItem[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-xl border border-border bg-background p-1", className)}>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
