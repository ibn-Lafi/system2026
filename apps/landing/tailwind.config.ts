import type { Config } from "tailwindcss";
import sharedPreset from "../../packages/config/tailwind.preset.js";

const config: Config = {
  presets: [sharedPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        // يُستخدم بشريط شعارات صفحة الهبوط (brand-logos-slider.tsx) — راجع
        // نفس التعليق بـ apps/store قبل نقل صفحة الهبوط لهذا التطبيق المستقل.
        marquee: "marquee 22s linear infinite",
      },
    },
  },
};

export default config;
