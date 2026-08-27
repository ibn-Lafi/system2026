"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createCitySchema,
  updateCitySchema,
  createBranchSchema,
  updateBranchSchema,
} from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

export async function createCustomerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createCustomerSchema.safeParse({
    name: formData.get("name"),
    shopName: formData.get("shopName") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    cityId: formData.get("cityId") || undefined,
    notes: formData.get("notes") || undefined,
    googleMapsLink: formData.get("googleMapsLink") || undefined,
    commercialRegistrationNumber: formData.get("commercialRegistrationNumber") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
    showInStore: formData.get("showInStore") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("customers").insert({
    name: parsed.data.name,
    shop_name: parsed.data.shopName ?? null,
    phone: parsed.data.phone ?? null,
    address: parsed.data.address ?? null,
    city_id: parsed.data.cityId ?? null,
    notes: parsed.data.notes ?? null,
    google_maps_link: parsed.data.googleMapsLink ?? null,
    commercial_registration_number: parsed.data.commercialRegistrationNumber ?? null,
    vat_number: parsed.data.vatNumber ?? null,
    show_in_store: parsed.data.showInStore,
  });

  if (error) return { error: error.message };

  revalidatePath("/customers");
  return { success: true };
}

export async function updateCustomerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateCustomerSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    shopName: formData.get("shopName") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    cityId: formData.get("cityId") || undefined,
    notes: formData.get("notes") || undefined,
    googleMapsLink: formData.get("googleMapsLink") || undefined,
    commercialRegistrationNumber: formData.get("commercialRegistrationNumber") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
    showInStore: formData.get("showInStore") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      shop_name: parsed.data.shopName ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      city_id: parsed.data.cityId ?? null,
      notes: parsed.data.notes ?? null,
      google_maps_link: parsed.data.googleMapsLink ?? null,
      commercial_registration_number: parsed.data.commercialRegistrationNumber ?? null,
      vat_number: parsed.data.vatNumber ?? null,
      show_in_store: parsed.data.showInStore,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${parsed.data.id}`);
  return { success: true };
}

export async function createCityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createCitySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("cities").insert({ name: parsed.data.name });
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return { success: true };
}

export async function updateCityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateCitySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("cities").update({ name: parsed.data.name }).eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return { success: true };
}

export async function createBranchAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createBranchSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    shopName: formData.get("shopName") || undefined,
    address: formData.get("address") || undefined,
    cityId: formData.get("cityId") || undefined,
    phone: formData.get("phone") || undefined,
    googleMapsLink: formData.get("googleMapsLink") || undefined,
    showInStore: formData.get("showInStore") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("customer_branches").insert({
    customer_id: parsed.data.customerId,
    name: parsed.data.name,
    shop_name: parsed.data.shopName ?? null,
    address: parsed.data.address ?? null,
    city_id: parsed.data.cityId ?? null,
    phone: parsed.data.phone ?? null,
    google_maps_link: parsed.data.googleMapsLink ?? null,
    show_in_store: parsed.data.showInStore,
  });
  if (error) return { error: error.message };

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { success: true };
}

export async function updateBranchAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateBranchSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    shopName: formData.get("shopName") || undefined,
    address: formData.get("address") || undefined,
    cityId: formData.get("cityId") || undefined,
    phone: formData.get("phone") || undefined,
    googleMapsLink: formData.get("googleMapsLink") || undefined,
    showInStore: formData.get("showInStore") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const customerId = formData.get("customerId");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("customer_branches")
    .update({
      name: parsed.data.name,
      shop_name: parsed.data.shopName ?? null,
      address: parsed.data.address ?? null,
      city_id: parsed.data.cityId ?? null,
      phone: parsed.data.phone ?? null,
      google_maps_link: parsed.data.googleMapsLink ?? null,
      show_in_store: parsed.data.showInStore,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  if (typeof customerId === "string") revalidatePath(`/customers/${customerId}`);
  return { success: true };
}
