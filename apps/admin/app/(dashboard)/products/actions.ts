"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
} from "@system2026/validation";
import { uploadImage, uploadImages } from "../../../lib/upload-image";

export type ActionState = { error?: string; success?: boolean };

// اسم الوحدة الافتراضية المُنشأة تلقائيًا لأي منتج لا يحدد المستخدم وحدته —
// صفحة المنتجات العامة لم تعد تعرض اختيار وحدة قياس (راجع CLAUDE.md §10)،
// بينما يبقى base_unit_id عمودًا إلزاميًا (NOT NULL) تعتمد عليه فواتير
// الشراء الحية (product_units + create_purchase_invoice). صفحة إضافة منتج
// المورد ما زالت تُرسل baseUnitId صراحةً وتبقى كما هي.
const DEFAULT_UNIT_NAME = "قطعة";

async function resolveBaseUnitId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  formBaseUnitId: FormDataEntryValue | null,
  existingBaseUnitId?: string | null,
): Promise<{ id?: string; error?: string }> {
  if (typeof formBaseUnitId === "string" && formBaseUnitId) return { id: formBaseUnitId };
  if (existingBaseUnitId) return { id: existingBaseUnitId };

  const { data: existingUnit } = await supabase
    .from("units")
    .select<"id", { id: string }>("id")
    .eq("name", DEFAULT_UNIT_NAME)
    .maybeSingle();
  if (existingUnit) return { id: existingUnit.id };

  const { data: createdUnit, error } = await supabase
    .from("units")
    .insert({ name: DEFAULT_UNIT_NAME })
    .select<"id", { id: string }>("id")
    .single();
  if (!error) return { id: createdUnit.id };

  // تسابق محتمل (طلب آخر أنشأ نفس الوحدة أولًا لتوها) — نعيد القراءة بدل الفشل.
  const { data: retryUnit } = await supabase
    .from("units")
    .select<"id", { id: string }>("id")
    .eq("name", DEFAULT_UNIT_NAME)
    .maybeSingle();
  if (retryUnit) return { id: retryUnit.id };

  return { error: error.message };
}

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = createSupabaseServerClient();

  const { id: baseUnitId, error: unitError } = await resolveBaseUnitId(
    supabase,
    formData.get("baseUnitId"),
  );
  if (unitError || !baseUnitId) return { error: unitError ?? "تعذّر تحديد وحدة القياس" };

  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    visibleInStore: formData.get("visibleInStore") === "on",
    hasExpiry: Boolean(formData.get("expiryDate")),
    expiryDate: formData.get("expiryDate") || undefined,
    baseUnitId,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  // حقل ملفات متعدد (images) بصفحة المنتجات العامة، أو حقل صورة واحدة (image)
  // بفورم إضافة منتج المورد — كلاهما مدعوم بنفس الأكشن.
  const { urls: imageUrls, error: imagesError } = await uploadImages(
    supabase,
    formData,
    "images",
    "product-images",
  );
  if (imagesError) return { error: imagesError };
  if (imageUrls.length === 0) {
    const { url: singleImageUrl, error: imageError } = await uploadImage(
      supabase,
      formData,
      "image",
      "product-images",
    );
    if (imageError) return { error: imageError };
    if (singleImageUrl) imageUrls.push(singleImageUrl);
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      category_id: parsed.data.categoryId ?? null,
      supplier_id: parsed.data.supplierId ?? null,
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      visible_in_store: parsed.data.visibleInStore,
      has_expiry: parsed.data.hasExpiry,
      expiry_date: parsed.data.expiryDate ?? null,
      base_unit_id: baseUnitId,
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
  const id = formData.get("id");
  if (typeof id !== "string") return { error: "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();

  const { data: existingProduct } = await supabase
    .from("products")
    .select<"base_unit_id", { base_unit_id: string }>("base_unit_id")
    .eq("id", id)
    .maybeSingle();

  const { id: baseUnitId, error: unitError } = await resolveBaseUnitId(
    supabase,
    formData.get("baseUnitId"),
    existingProduct?.base_unit_id,
  );
  if (unitError || !baseUnitId) return { error: unitError ?? "تعذّر تحديد وحدة القياس" };

  const parsed = updateProductSchema.safeParse({
    id,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    visibleInStore: formData.get("visibleInStore") === "on",
    hasExpiry: Boolean(formData.get("expiryDate")),
    expiryDate: formData.get("expiryDate") || undefined,
    baseUnitId,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
    quantityReason: formData.get("quantityReason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const { urls: newImageUrls, error: imagesError } = await uploadImages(
    supabase,
    formData,
    "images",
    "product-images",
  );
  if (imagesError) return { error: imagesError };
  if (newImageUrls.length === 0) {
    const { url: singleImageUrl, error: imageError } = await uploadImage(
      supabase,
      formData,
      "image",
      "product-images",
    );
    if (imageError) return { error: imageError };
    if (singleImageUrl) newImageUrls.push(singleImageUrl);
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      category_id: parsed.data.categoryId ?? null,
      supplier_id: parsed.data.supplierId ?? null,
      ...(newImageUrls.length > 0 ? { image_url: newImageUrls[0], image_urls: newImageUrls } : {}),
      visible_in_store: parsed.data.visibleInStore,
      has_expiry: parsed.data.hasExpiry,
      expiry_date: parsed.data.expiryDate ?? null,
      base_unit_id: baseUnitId,
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
