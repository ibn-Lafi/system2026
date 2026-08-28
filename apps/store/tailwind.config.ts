import type { Config } from "tailwindcss";
import sharedPreset from "../../packages/config/tailwind.preset.js";

const config: Config = {
  presets: [sharedPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        // يُستخدم في شريط شعارات صفحة الهبوط (brand-logos-slider.tsx) —
        // العنصر يُكرَّر مرتين والحركة تنقله بمقدار نصف عرضه فقط، فيبدو
        // التمرير مستمرًا بلا نهاية بغض النظر عن عرض المحتوى الفعلي.
        marquee: "marquee 22s linear infinite",
      },
    },
  },
};

export default config;
