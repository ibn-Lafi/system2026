import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// خط Cairo محلي (لا يحتاج اتصال شبكة وقت البناء) — راجع apps/admin/app/layout.tsx
const cairo = localFont({
  src: "./fonts/cairo-variable.ttf",
  weight: "200 1000",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "كاشير سبعة",
  description: "نقطة بيع سبعة",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>{children}</body>
    </html>
  );
}
