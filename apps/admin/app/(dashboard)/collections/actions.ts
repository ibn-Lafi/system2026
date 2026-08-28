"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { recordCustomerPaymentSchema } from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

export async function recordCustomerPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const invoiceIdRaw = formData.get("invoiceId");
  const parsed = recordCustomerPaymentSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceId: invoiceIdRaw ? invoiceIdRaw : undefined,
    amount: Number(formData.get("amount")),
    method: formData.get("method"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("record_customer_payment", {
    p_customer_id: parsed.data.customerId,
    p_invoice_id: parsed.data.invoiceId ?? null,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
  });

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath("/invoices");
  return { success: true };
}
