import localFont from "next/font/local";

// خط "ثمانية" الخاص بصفحة الهبوط فقط (حملة تسويقية منفصلة عن هوية المتجر
// العامة التي تستخدم Cairo) — مصدره ملف رفعه المستخدم لجذر المستودع.
// مشترك بين LandingHero وشعار "سبعة" داخل شريط العلامات التجارية.
export const thmanyahSans = localFont({
  src: [
    { path: "../app/fonts/thmanyah/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../app/fonts/thmanyah/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
});
