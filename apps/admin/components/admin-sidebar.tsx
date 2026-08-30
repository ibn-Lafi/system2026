"use client";

import { useEffect, useState } from "react";
import { cn } from "@system2026/ui";
import { AdminNav, type NavItem } from "./admin-nav";
import { CollapseIcon } from "./icons";

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminSidebar({
  navItems,
  settingsItems,
}: {
  navItems: NavItem[];
  settingsItems: NavItem[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-l border-border bg-background p-4 transition-[width]",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("mb-5 flex items-center", collapsed ? "justify-center" : "justify-end px-1")}>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <CollapseIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      {collapsed ? null : (
        <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">القائمة الرئيسية</p>
      )}
      <div className="flex-1 overflow-y-auto">
        <AdminNav items={navItems} collapsed={collapsed} />

        {settingsItems.length > 0 ? (
          <>
            {collapsed ? (
              <div className="my-3 h-px bg-border" />
            ) : (
              <p className="mb-2 mt-5 px-2 text-xs font-medium text-muted-foreground">الإعدادات</p>
            )}
            <AdminNav items={settingsItems} collapsed={collapsed} />
          </>
        ) : null}
      </div>
    </aside>
  );
}
