import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// خط Cairo رسمي موحّد لكل واجهات النظام والمستندات (فواتير/PDF) — محمَّل
// محليًا (Variable Font مرخّص OFL من google/fonts) بدل next/font/google،
// لأن الأخير يحتاج جلب الخط من فونتس جوجل وقت البناء (build-time fetch)
// وقد يفشل خلف بروكسي/شبكة مقيّدة (كما بهذه البيئة السحابية) — التحميل
// المحلي لا يحتاج أي اتصال شبكة وقت البناء إطلاقًا. راجع
// packages/config/tailwind.preset.js حيث تُضبط كـ font-sans الافتراضي.
const cairo = localFont({
  src: "./fonts/cairo-variable.ttf",
  weight: "200 1000",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "لوحة تحكم سبعة",
  description: "لوحة تحكم منصة سبعة (SBAAH)",
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
