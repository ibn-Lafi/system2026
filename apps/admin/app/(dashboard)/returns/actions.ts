"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createReturnSchema } from "@system2026/validation";

export type ReturnActionState = { error?: string; returnId?: string };

export async function createReturnAction(
  _prevState: ReturnActionState,
  formData: FormData,
): Promise<ReturnActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const invoiceId = formData.get("invoiceId");

  const parsed = createReturnSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceId: invoiceId ? invoiceId : undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات المرتجع غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { data: returnId, error } = await supabase.rpc("process_return", {
    p_customer_id: parsed.data.customerId,
    p_invoice_id: parsed.data.invoiceId ?? null,
    p_rep_id: null,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      condition: item.condition,
    })),
  });

  if (error) return { error: error.message };

  revalidatePath("/returns");
  revalidatePath("/customers");
  return { returnId: returnId ?? undefined };
}

export type CustomerInvoice = {
  id: string;
  invoiceNumber: number;
  invoiceDate: string;
  totalAmount: number;
  status: string;
};

export async function getCustomerInvoicesAction(customerId: string): Promise<CustomerInvoice[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, total_amount, status",
      { id: string; invoice_number: number; invoice_date: string; total_amount: number; status: string }
    >("id, invoice_number, invoice_date, total_amount, status")
    .eq("customer_id", customerId)
    .neq("status", "cancelled")
    .order("invoice_date", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    totalAmount: row.total_amount,
    status: row.status,
  }));
}

export type ReturnableItem = {
  productId: string;
  productName: string;
  unitName: string;
  unitPrice: number;
  maxQuantity: number;
};

// بنود فاتورة معيّنة القابلة للإرجاع — تطرح كل ما تم إرجاعه مسبقًا لنفس
// الفاتورة (عبر return_records/return_items) من الكمية المباعة أصلًا،
// حتى لا يتكرر إرجاع نفس البند أكثر من مرة أو بكمية أكبر من المباعة.
export async function getInvoiceReturnableItemsAction(invoiceId: string): Promise<ReturnableItem[]> {
  const supabase = createSupabaseServerClient();

  const { data: items } = await supabase
    .from("invoice_items")
    .select<
      "product_id, unit_id, quantity_in_unit, unit_price",
      { product_id: string; unit_id: string; quantity_in_unit: number; unit_price: number }
    >("product_id, unit_id, quantity_in_unit, unit_price")
    .eq("invoice_id", invoiceId);

  if (!items || items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.product_id))];
  const unitIds = [...new Set(items.map((i) => i.unit_id))];

  const [{ data: products }, { data: units }, { data: relatedReturns }] = await Promise.all([
    supabase.from("products").select<"id, name", { id: string; name: string }>("id, name").in("id", productIds),
    supabase.from("units").select<"id, name", { id: string; name: string }>("id, name").in("id", unitIds),
    supabase
      .from("return_records")
      .select<"id", { id: string }>("id")
      .eq("invoice_id", invoiceId),
  ]);

  const returnIds = (relatedReturns ?? []).map((r) => r.id);
  const { data: returnedItems } =
    returnIds.length > 0
      ? await supabase
          .from("return_items")
          .select<"product_id, quantity", { product_id: string; quantity: number }>("product_id, quantity")
          .in("return_id", returnIds)
      : { data: [] as { product_id: string; quantity: number }[] };

  const returnedByProduct = new Map<string, number>();
  for (const r of returnedItems ?? []) {
    returnedByProduct.set(r.product_id, (returnedByProduct.get(r.product_id) ?? 0) + r.quantity);
  }

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  return items
    .map((item) => {
      const alreadyReturned = returnedByProduct.get(item.product_id) ?? 0;
      const maxQuantity = Math.max(0, item.quantity_in_unit - alreadyReturned);
      return {
        productId: item.product_id,
        productName: productNameById.get(item.product_id) ?? "—",
        unitName: unitNameById.get(item.unit_id) ?? "—",
        unitPrice: item.unit_price,
        maxQuantity,
      };
    })
    .filter((item) => item.maxQuantity > 0);
}
