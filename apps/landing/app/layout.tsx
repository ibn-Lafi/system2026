import type { Metadata, Viewport } from "next";
import "./globals.css";

// محتوى صفحة الهبوط ثابت (حملة تسويقية "سبعة/SBAAH")، وليس مُدارًا من
// إعدادات المتجر — راجع components/landing-hero.tsx.
export const metadata: Metadata = {
  title: "سبعة | SBAAH",
  description: "وش تتمنى يكون عندنا؟",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
