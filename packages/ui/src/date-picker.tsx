"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, type DateRange } from "./calendar";
import { cn } from "./cn";

function CalendarTriggerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

// إغلاق النافذة المنبثقة عند الضغط خارجها أو بمفتاح Escape — مشترك بين
// DatePicker وDateRangePicker أدناه.
function usePopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // النافذة المنبثقة absolute داخل هذا العنصر، وهذا الأخير غالبًا ما يكون
  // داخل حاوية قابلة للتمرير (مثل Modal بـ overflow-y-auto) — فتحها قرب أسفل
  // حاوية طويلة يجعلها تُرسم خارج الجزء المرئي من التمرير الحالي دون أي إشارة
  // للمستخدم، فيظن أن التقويم لا يظهر إطلاقًا. نمرّر إليها تلقائيًا عند الفتح.
  useEffect(() => {
    if (!open) return;
    popoverRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return { open, setOpen, containerRef, popoverRef };
}

// yyyy-mm-dd بالتوقيت المحلي — لا نستخدم toISOString() لأنها تحوّل بتوقيت UTC
// وقد تُزيح التاريخ يومًا كاملًا حسب فرق التوقيت المحلي.
function toInputValue(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromInputValue(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TRIGGER_CLASS =
  "flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-black/90 transition-colors hover:bg-neutral-50";
const POPOVER_CLASS = "absolute z-20 mt-2 overflow-hidden rounded-2xl border border-neutral-200 shadow-pop";

export function DatePicker({
  name,
  defaultValue,
  placeholder = "اختر تاريخًا",
  className,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const { open, setOpen, containerRef, popoverRef } = usePopover();
  const [date, setDate] = useState<Date | undefined>(fromInputValue(defaultValue));

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)} dir="ltr">
      <input type="hidden" name={name} value={toInputValue(date)} />
      <button type="button" onClick={() => setOpen((v) => !v)} className={TRIGGER_CLASS}>
        <span>{date ? formatDisplayDate(date) : placeholder}</span>
        <CalendarTriggerIcon />
      </button>
      {open ? (
        <div ref={popoverRef} className={POPOVER_CLASS}>
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(d) => {
              setDate(d);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DateRangePicker({
  fromName,
  toName,
  defaultFrom,
  defaultTo,
  placeholder = "اختر الفترة",
  className,
}: {
  fromName: string;
  toName: string;
  defaultFrom?: string | null;
  defaultTo?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const { open, setOpen, containerRef, popoverRef } = usePopover();
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = fromInputValue(defaultFrom);
    if (!from) return undefined;
    return { from, to: fromInputValue(defaultTo) };
  });

  const label = range?.from
    ? range.to
      ? `${formatDisplayDate(range.from)} - ${formatDisplayDate(range.to)}`
      : formatDisplayDate(range.from)
    : placeholder;

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)} dir="ltr">
      <input type="hidden" name={fromName} value={toInputValue(range?.from)} />
      <input type="hidden" name={toName} value={toInputValue(range?.to)} />
      <button type="button" onClick={() => setOpen((v) => !v)} className={TRIGGER_CLASS}>
        <span>{label}</span>
        <CalendarTriggerIcon />
      </button>
      {open ? (
        <div ref={popoverRef} className={POPOVER_CLASS}>
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from}
            onSelect={(r) => {
              setRange(r);
              if (r?.from && r?.to) setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
