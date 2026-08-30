"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@system2026/database/server";
import { submitStoreLeadSchema, identifyCustomerSchema, storeOrderSchema } from "@system2026/validation";
import { createSupabaseAdminClient } from "../lib/supabase-admin";
import { isRateLimited } from "../lib/rate-limit";

const STORE_CUSTOMER_COOKIE = "store_customer_id";

export type SubmitLeadState = { error?: string; success?: boolean };

// أول عملية كتابة عامة (anon) من المتجر — محكومة بـ RLS صريحة على
// store_leads (INSERT فقط، لا SELECT/UPDATE/DELETE لـ anon). راجع migration
// 20260822160000_store_leads_landing_page.sql.
export async function submitStoreLeadAction(
  _prevState: SubmitLeadState,
  formData: FormData,
): Promise<SubmitLeadState> {
  const parsed = submitStoreLeadSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    desiredStore: formData.get("desiredStore"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("store_leads").insert({
    phone_number: `+966${parsed.data.phoneNumber.slice(1)}`,
    desired_store: parsed.data.desiredStore,
  });

  if (error) return { error: "حدث خطأ، حاول مرة أخرى" };
  return { success: true };
}

export type IdentifyStoreCustomerResult = { customerId?: string; customerName?: string; error?: string };

// يُنادى مباشرة من صفحة /checkout عند إدخال رقم الجوال — يستدعي نفس
// find_or_create_customer_by_phone المشتركة مع apps/cashier، فيضمن هوية
// عميل واحدة موحّدة بغض النظر عن قناة أول تواصل (راجع CLAUDE.md محدَّث).
export async function identifyStoreCustomerAction(phone: string, name?: string): Promise<IdentifyStoreCustomerResult> {
  const parsed = identifyCustomerSchema.safeParse({ phone, name });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "رقم جوال غير صالح" };

  if (isRateLimited(`identify:${parsed.data.phone}`, 5, 10 * 60 * 1000)) {
    return { error: "محاولات كثيرة، حاول مرة أخرى بعد قليل" };
  }

  const fullPhone = `+966${parsed.data.phone.slice(1)}`;
  const supabase = createSupabaseAdminClient();
  const { data: customerId, error } = await supabase.rpc("find_or_create_customer_by_phone", {
    p_phone: fullPhone,
    p_name: parsed.data.name ?? null,
  });
  if (error || !customerId) return { error: error?.message ?? "تعذّر إيجاد/تسجيل العميل" };

  const { data: customer } = await supabase
    .from("customers")
    .select<"name", { name: string }>("name")
    .eq("id", customerId)
    .single();

  cookies().set(STORE_CUSTOMER_COOKIE, customerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return { customerId, customerName: customer?.name };
}

export async function logoutStoreCustomerAction(): Promise<void> {
  cookies().delete(STORE_CUSTOMER_COOKIE);
}

export type PlaceOrderResult = { invoiceNumber?: number; error?: string };

export async function placeOrderAction(items: { productId: string; quantity: number }[]): Promise<PlaceOrderResult> {
  const customerId = cookies().get(STORE_CUSTOMER_COOKIE)?.value;
  if (!customerId) return { error: "الرجاء إدخال رقم الجوال أولًا" };

  const parsed = storeOrderSchema.safeParse({ customerId, items });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات الطلب غير صالحة" };

  if (isRateLimited(`order:${customerId}`, 10, 60 * 60 * 1000)) {
    return { error: "عدد كبير من الطلبات، حاول مرة أخرى لاحقًا" };
  }

  const supabase = createSupabaseAdminClient();
  const { data: invoiceId, error } = await supabase.rpc("create_online_store_order", {
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  });
  if (error || !invoiceId) return { error: error?.message ?? "تعذّر إتمام الطلب" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select<"invoice_number", { invoice_number: number }>("invoice_number")
    .eq("id", invoiceId)
    .single();

  return { invoiceNumber: invoice?.invoice_number };
}
