"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createUnitSchema,
  updateUnitSchema,
} from "@system2026/validation";
import { uploadImage } from "../../../lib/upload-image";

export type ActionState = { error?: string; success?: boolean };

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    visibleInStore: formData.get("visibleInStore") === "on",
    hasExpiry: formData.get("hasExpiry") === "on",
    expiryDate: formData.get("expiryDate") || undefined,
    baseUnitId: formData.get("baseUnitId"),
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();

  const { url: imageUrl, error: imageError } = await uploadImage(
    supabase,
    formData,
    "image",
    "product-images",
  );
  if (imageError) return { error: imageError };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      category_id: parsed.data.categoryId ?? null,
      supplier_id: parsed.data.supplierId ?? null,
      image_url: imageUrl ?? null,
      visible_in_store: parsed.data.visibleInStore,
      has_expiry: parsed.data.hasExpiry,
      expiry_date: parsed.data.expiryDate ?? null,
      base_unit_id: parsed.data.baseUnitId,
    })
    .select<"id", { id: string }>("id")
    .single();

  if (error) return { error: error.message };

  if (parsed.data.quantity !== undefined && parsed.data.quantity > 0) {
    const { error: stockError } = await supabase.rpc("set_warehouse_stock_quantity", {
      p_product_id: product.id,
      p_new_quantity: parsed.data.quantity,
      p_reason: "كمية افتتاحية عند إضافة المنتج",
    });
    if (stockError) return { error: stockError.message };
  }

  revalidatePath("/products");
  revalidatePath("/warehouse");
  return { success: true };
}

export async function updateProductAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateProductSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    visibleInStore: formData.get("visibleInStore") === "on",
    hasExpiry: formData.get("hasExpiry") === "on",
    expiryDate: formData.get("expiryDate") || undefined,
    baseUnitId: formData.get("baseUnitId"),
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
    quantityReason: formData.get("quantityReason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();

  const { url: imageUrl, error: imageError } = await uploadImage(
    supabase,
    formData,
    "image",
    "product-images",
  );
  if (imageError) return { error: imageError };

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      category_id: parsed.data.categoryId ?? null,
      supplier_id: parsed.data.supplierId ?? null,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      visible_in_store: parsed.data.visibleInStore,
      has_expiry: parsed.data.hasExpiry,
      expiry_date: parsed.data.expiryDate ?? null,
      base_unit_id: parsed.data.baseUnitId,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  if (parsed.data.quantity !== undefined) {
    const { error: stockError } = await supabase.rpc("set_warehouse_stock_quantity", {
      p_product_id: parsed.data.id,
      p_new_quantity: parsed.data.quantity,
      p_reason: parsed.data.quantityReason ?? "تعديل من صفحة المنتج",
    });
    if (stockError) return { error: stockError.message };
  }

  revalidatePath("/products");
  revalidatePath("/warehouse");
  return { success: true };
}

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();

  const { url: imageUrl, error: imageError } = await uploadImage(
    supabase,
    formData,
    "image",
    "category-images",
  );
  if (imageError) return { error: imageError };

  const { error } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name, image_url: imageUrl ?? null });
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function updateCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();

  const { url: imageUrl, error: imageError } = await uploadImage(
    supabase,
    formData,
    "image",
    "category-images",
  );
  if (imageError) return { error: imageError };

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, ...(imageUrl ? { image_url: imageUrl } : {}) })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function createUnitAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createUnitSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("units").insert({ name: parsed.data.name });
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function updateUnitAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateUnitSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("units").update({ name: parsed.data.name }).eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function addProductUnitAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const productId = formData.get("productId");
  const unitId = formData.get("unitId");
  const conversionFactor = Number(formData.get("conversionFactor"));
  const unitPriceRaw = formData.get("unitPrice");

  if (typeof productId !== "string" || typeof unitId !== "string" || !conversionFactor) {
    return { error: "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("product_units").insert({
    product_id: productId,
    unit_id: unitId,
    conversion_factor_to_base: conversionFactor,
    unit_price: unitPriceRaw ? Number(unitPriceRaw) : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

// أرشفة منتج (بدل حذف فعلي) — يُخفيه من كتالوج المتجر دون حذف بياناته،
// لأن فواتير تاريخية قد تشير إليه (product_id). راجع CLAUDE.md.
export async function toggleProductActiveAction(formData: FormData): Promise<void> {
  const productId = formData.get("productId");
  const nextIsActive = formData.get("nextIsActive") === "true";
  if (typeof productId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.from("products").update({ is_active: nextIsActive }).eq("id", productId);

  revalidatePath("/products");
}
