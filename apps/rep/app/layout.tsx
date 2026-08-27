import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { InvoiceModalProvider } from "../components/invoice-modal-provider";
import { ReturnModalProvider } from "../components/return-modal-provider";
import { CollectionModalProvider } from "../components/collection-modal-provider";

// خط Cairo محلي (لا يحتاج اتصال شبكة وقت البناء) — راجع تعليق admin/app/layout.tsx
const cairo = localFont({
  src: "./fonts/cairo-variable.ttf",
  weight: "200 1000",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "سبعة — تطبيق المندوب",
  description: "خط السير، الفواتير الميدانية، والتحصيلات — منصة سبعة (SBAAH)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="bg-muted">
        {/* إطار بعرض جوال ثابت (max-w-[430px]) — يملأ الشاشة كاملة فعليًا على
            جوال حقيقي، ويظهر كعمود متوسّط بعرض جوال على شاشة أوسع (كمبيوتر)،
            بدل تمدد المحتوى بعرض غير مناسب.
            ملاحظة مهمة: بدون transform هنا عمدًا — لو أضيف transform لهذا
            العنصر، عناصر position:fixed بداخله (شريط التنقل) تفقد ثباتها
            بالشاشة أثناء التمرير وتتصرف كأنها position:absolute بدل ذلك
            (سلوك CSS معروف)، فيتحرك الشريط مع طول الصفحة بدل البقاء مثبّتًا
            بأسفل الشاشة المرئية. شريط التنقل بنفسه (fixed + inset-x + mx-auto
            + max-w) يتمركز تلقائيًا على نفس محور هذا الإطار لأن الاثنين
            يتمركزان أفقيًا داخل نفس الـ viewport. */}
        <div id="app-frame" className="relative mx-auto min-h-screen w-full max-w-[430px] bg-background shadow-2xl">
          <InvoiceModalProvider>
            <ReturnModalProvider>
              <CollectionModalProvider>{children}</CollectionModalProvider>
            </ReturnModalProvider>
          </InvoiceModalProvider>
        </div>
      </body>
    </html>
  );
}
