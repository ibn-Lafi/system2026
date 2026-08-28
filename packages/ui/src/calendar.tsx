"use client";

import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "./cn";

export type { DateRange } from "react-day-picker";

function CalendarChevron({
  orientation,
  className,
}: {
  orientation?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const d = orientation === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <path d={d} />
    </svg>
  );
}

export type CalendarProps = DayPickerProps;

// تقويم داكن موحّد لكل عمليات اختيار التاريخ بالنظام (فترة أو تاريخ واحد) —
// يُستخدم دائمًا داخل نافذة منبثقة صغيرة (راجع date-picker.tsx)، وليس
// مكوّنًا مستقلًا قائمًا بذاته بالصفحة.
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      dir="ltr"
      showOutsideDays={showOutsideDays}
      className={cn("bg-white p-4 text-black", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "relative flex h-8 items-center justify-center",
        caption_label: "text-base font-bold",
        nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
        button_previous:
          "flex h-7 w-7 items-center justify-center rounded-md text-black/60 transition-colors hover:bg-black/5 hover:text-black disabled:pointer-events-none disabled:opacity-30",
        button_next:
          "flex h-7 w-7 items-center justify-center rounded-md text-black/60 transition-colors hover:bg-black/5 hover:text-black disabled:pointer-events-none disabled:opacity-30",
        month_grid: "mt-4 w-full border-collapse",
        weekdays: "flex",
        weekday: "flex h-9 w-10 items-center justify-center text-sm font-normal text-black/40",
        week: "mt-1 flex",
        day: "p-0 text-center text-sm",
        day_button:
          "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-black/90 transition-colors hover:bg-black/5",
        today: "[&>button]:font-bold",
        selected: "[&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black",
        range_start: "rounded-s-full bg-black/5 [&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black",
        range_end: "rounded-e-full bg-black/5 [&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black",
        range_middle: "bg-black/5 [&>button]:rounded-none [&>button]:hover:bg-transparent",
        outside: "[&>button]:text-black/30",
        disabled: "[&>button]:pointer-events-none [&>button]:text-black/20",
        hidden: "invisible",
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron }}
      {...props}
    />
  );
}
