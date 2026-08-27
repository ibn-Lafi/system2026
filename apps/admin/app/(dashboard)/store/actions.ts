"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  updateStoreBrandingSchema,
  updateStoreSocialLinksSchema,
  updateStoreHomepageSectionsSchema,
  updateStoreLandingModeSchema,
} from "@system2026/validation";
import { uploadImage } from "../../../lib/upload-image";
import type { ActionState } from "../../../components/action-form";

export async function updateStoreBrandingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateStoreBrandingSchema.safeParse({
    storeName: formData.get("storeName"),
    heroKicker: formData.get("heroKicker"),
    heroTitle: formData.get("heroTitle"),
    siteDescription: formData.get("siteDescription") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("store_settings")
    .update({
      store_name: parsed.data.storeName,
      hero_kicker: parsed.data.heroKicker,
      hero_title: parsed.data.heroTitle,
      site_description: parsed.data.siteDescription ?? "",
      updated_by: user?.id,
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/store");
  return { success: true };
}

export async function updateStoreLogoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = createSupabaseServerClient();

  const { url: logoUrl, error: uploadError } = await uploadImage(supabase, formData, "logo", "store-assets");
  if (uploadError) return { error: uploadError };
  if (!logoUrl) return { error: "الرجاء اختيار صورة الشعار" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("store_settings")
    .update({ logo_url: logoUrl, updated_by: user?.id })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/store");
  return { success: true };
}

export async function updateStoreSocialLinksAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateStoreSocialLinksSchema.safeParse({
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    instagramUrl: formData.get("instagramUrl") || undefined,
    tiktokUrl: formData.get("tiktokUrl") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("store_settings")
    .update({
      whatsapp_number: parsed.data.whatsappNumber || null,
      instagram_url: parsed.data.instagramUrl || null,
      tiktok_url: parsed.data.tiktokUrl || null,
      updated_by: user?.id,
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/store");
  return { success: true };
}

export async function updateStoreLandingModeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateStoreLandingModeSchema.safeParse({
    showLandingPage: formData.get("showLandingPage") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("store_settings")
    .update({
      show_landing_page: parsed.data.showLandingPage,
      updated_by: user?.id,
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/store");
  return { success: true };
}

export async function updateStoreHomepageSectionsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateStoreHomepageSectionsSchema.safeParse({
    showPointsOfSaleSection: formData.get("showPointsOfSaleSection") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("store_settings")
    .update({
      show_points_of_sale_section: parsed.data.showPointsOfSaleSection,
      updated_by: user?.id,
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/store");
  return { success: true };
}
