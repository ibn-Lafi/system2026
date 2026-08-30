import { cache } from "react";
import { createSupabaseServerClient } from "@system2026/database/server";

export type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  hero_kicker: string;
  hero_title: string;
  site_description: string;
  whatsapp_number: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  show_points_of_sale_section: boolean;
  custom_css: string | null;
  custom_html: string | null;
};

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  store_name: "متجري",
  logo_url: null,
  hero_kicker: "STORE",
  hero_title: "مرحبًا بك في متجرنا",
  site_description: "تصفّح منتجاتنا وتسوّق بسهولة",
  whatsapp_number: null,
  instagram_url: null,
  tiktok_url: null,
  show_points_of_sale_section: true,
  custom_css: null,
  custom_html: null,
};

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("public_store_settings").select("*").single();
  return data ?? DEFAULT_STORE_SETTINGS;
});
