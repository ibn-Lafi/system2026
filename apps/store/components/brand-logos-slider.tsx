import { thmanyahSans } from "../lib/thmanyah-font";

// شريط شعارات متحرك بلا نهاية (marquee) بـ CSS خالص — بدون إضافة تبعية
// framer-motion الخاصة بـ motion-primitives، لأن التمرير المستمر البسيط لا
// يحتاج أكثر من keyframes (راجع animation.marquee بـ tailwind.config.ts).
// الشعارات نصية (wordmarks) بيضاء بلا صور خارجية — لا نملك ملفات الشعارات
// الرسمية للعلامات التجارية المذكورة. شعار "سبعة" مميَّز بشارة (badge) بارزة
// عن بقية الشعارات المجاورة الباهتة، لأنه علامتنا نحن وسط علامات أخرى.
const LOGOS: { key: string; highlight?: boolean; node: React.ReactNode }[] = [
  {
    key: "mcdonalds",
    node: <span className="whitespace-nowrap text-2xl font-black lg:text-3xl">ماكدونالدز</span>,
  },
  {
    key: "half-million",
    node: <span className="whitespace-nowrap text-2xl font-black lg:text-3xl">هاف مليون</span>,
  },
  {
    key: "nike",
    node: (
      <span dir="ltr" className="whitespace-nowrap text-2xl font-black italic tracking-tight lg:text-3xl">
        Nike
      </span>
    ),
  },
  {
    key: "albaik",
    node: <span className="whitespace-nowrap text-2xl font-black lg:text-3xl">البيك</span>,
  },
  {
    key: "sbaah",
    highlight: true,
    node: (
      <span className={`${thmanyahSans.className} whitespace-nowrap text-3xl font-black lg:text-4xl`}>سـبـعـة</span>
    ),
  },
];

export function BrandLogosSlider({ className }: { className?: string }) {
  return (
    <div
      dir="ltr"
      className={`overflow-hidden ${className ?? ""}`}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="flex w-max animate-marquee items-center gap-10 lg:gap-14">
        {[...LOGOS, ...LOGOS].map((logo, index) =>
          logo.highlight ? (
            <div
              key={`${logo.key}-${index}`}
              className="flex items-center rounded-full bg-background/15 px-5 py-2 text-background shadow-lg ring-1 ring-background/25 lg:px-6 lg:py-2.5"
            >
              {logo.node}
            </div>
          ) : (
            <div key={`${logo.key}-${index}`} className="text-background/60">
              {logo.node}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
