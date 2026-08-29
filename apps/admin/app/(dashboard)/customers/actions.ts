"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  createBranchSchema,
  updateBranchSchema,
  addLoyaltyPointsSchema,
  createComplaintSchema,
  updateComplaintStatusSchema,
} from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

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

export async function addLoyaltyPointsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = addLoyaltyPointsSchema.safeParse({
    customerId: formData.get("customerId"),
    points: Number(formData.get("points")),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("add_loyalty_points", {
    p_customer_id: parsed.data.customerId,
    p_points: parsed.data.points,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { success: true };
}

export async function createComplaintAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createComplaintSchema.safeParse({
    customerId: formData.get("customerId"),
    branchId: formData.get("branchId") || undefined,
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("customer_complaints").insert({
    customer_id: parsed.data.customerId,
    branch_id: parsed.data.branchId ?? null,
    description: parsed.data.description,
  });
  if (error) return { error: error.message };

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { success: true };
}

export async function updateComplaintStatusAction(formData: FormData): Promise<void> {
  const parsed = updateComplaintStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const customerId = formData.get("customerId");

  const supabase = createSupabaseServerClient();
  await supabase.from("customer_complaints").update({ status: parsed.data.status }).eq("id", parsed.data.id);

  if (typeof customerId === "string") revalidatePath(`/customers/${customerId}`);
}
