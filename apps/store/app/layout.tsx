import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Footer } from "../components/footer";
import { CartBar } from "../components/cart-bar";
import { CartProvider } from "../lib/cart-context";
import { getStoreSettings } from "../lib/get-store-settings";
import "./globals.css";

// خط Cairo محلي (لا يحتاج اتصال شبكة وقت البناء) — راجع تعليق apps/admin/app/layout.tsx
const cairo = localFont({
  src: "./fonts/cairo-variable.ttf",
  weight: "200 1000",
  variable: "--font-cairo",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: settings.store_name,
    description: settings.site_description,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();

  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      {settings.custom_css ? (
        <head>
          {/* CSS مخصص من لوحة تحكم المتجر — يتجاوز متغيرات الثيم الافتراضي بـ globals.css */}
          <style dangerouslySetInnerHTML={{ __html: settings.custom_css }} />
        </head>
      ) : null}
      <body>
        <CartProvider>
          {children}
          {settings.show_landing_page ? null : <Footer settings={settings} />}
          {settings.show_landing_page ? null : <CartBar />}
        </CartProvider>
      </body>
    </html>
  );
}
