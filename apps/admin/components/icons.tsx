type IconProps = { className?: string };

function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </Icon>
  );
}

export function BoxIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </Icon>
  );
}

export function TruckIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M2.5 6.5h11v10h-11z" />
      <path d="M13.5 10h4l3 3.2V16.5h-7z" />
      <circle cx="6.5" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </Icon>
  );
}

export function CartIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3 4h2l2 11h11l2-7.5H6.5" />
      <circle cx="9.5" cy="19" r="1.3" />
      <circle cx="16.5" cy="19" r="1.3" />
    </Icon>
  );
}

export function WarehouseIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3 10.5 12 4l9 6.5V20H3Z" />
      <path d="M9 20v-6h6v6" />
    </Icon>
  );
}

export function TransferIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 8h13M13 4l4 4-4 4" />
      <path d="M20 16H7M11 12l-4 4 4 4" />
    </Icon>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.3" />
      <path d="M15.8 14.7c2.4.4 4.2 2.5 4.2 5" />
    </Icon>
  );
}

export function StoreIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3.5 9 5 4h14l1.5 5" />
      <path d="M3.5 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 9v11h14V9" />
    </Icon>
  );
}

export function InvoiceIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  );
}

export function EditIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 7.5l3 3" />
    </Icon>
  );
}

export function ReturnIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 12a8 8 0 1 0 3-6.2" />
      <path d="M4 4v5h5" />
    </Icon>
  );
}

export function WalletIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M15 14.5h3" />
    </Icon>
  );
}

export function CreditCardIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M7 14.5h4" />
    </Icon>
  );
}

export function ChartIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-7" />
    </Icon>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.4-.7-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-.7a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.4.7 2-3.4-2-1.5Z" />
    </Icon>
  );
}

export function CollapseIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3.5" y="4" width="17" height="16" rx="3" />
      <path d="M14.5 4v16" />
    </Icon>
  );
}

export function ChevronIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  );
}

export function PersonIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </Icon>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function HrIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9.5" cy="10.5" r="2" />
      <path d="M6 16c.7-1.8 2-2.7 3.5-2.7s2.8.9 3.5 2.7" />
      <path d="M14.5 9h4M14.5 12.5h4" />
    </Icon>
  );
}
