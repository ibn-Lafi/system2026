"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";
import {
  HomeIcon,
  BoxIcon,
  TruckIcon,
  CartIcon,
  WarehouseIcon,
  TransferIcon,
  UsersIcon,
  StoreIcon,
  InvoiceIcon,
  EditIcon,
  ReturnIcon,
  WalletIcon,
  CreditCardIcon,
  ChartIcon,
  SettingsIcon,
  HrIcon,
} from "./icons";

export const ICON_MAP = {
  home: HomeIcon,
  box: BoxIcon,
  truck: TruckIcon,
  cart: CartIcon,
  warehouse: WarehouseIcon,
  transfer: TransferIcon,
  users: UsersIcon,
  store: StoreIcon,
  invoice: InvoiceIcon,
  edit: EditIcon,
  return: ReturnIcon,
  wallet: WalletIcon,
  creditCard: CreditCardIcon,
  chart: ChartIcon,
  settings: SettingsIcon,
  hr: HrIcon,
} as const;

export type IconName = keyof typeof ICON_MAP;
export type NavItem = { href: string; label: string; icon: IconName };

export function AdminNav({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        const Icon = ICON_MAP[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2.5",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {collapsed ? null : <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
