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
};

export default config;
