"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@system2026/ui";
import { BellIcon } from "./icons";
import type { NotificationItem } from "../lib/notifications";

export function NotificationsBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="التنبيهات"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
      >
        <BellIcon className="h-5 w-5" />
        {notifications.length > 0 ? (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {notifications.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 z-20 mt-2 w-80 rounded-xl border border-border bg-background p-2 shadow-lg">
          <p className="px-2 py-1.5 text-sm font-semibold">التنبيهات</p>
          {notifications.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">لا توجد تنبيهات حاليًا</p>
          ) : (
            <ul className="space-y-0.5">
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg p-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.message}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
