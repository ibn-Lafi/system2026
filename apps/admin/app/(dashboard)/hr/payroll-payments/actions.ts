"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { payPayrollItemSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function payPayrollItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = payPayrollItemSchema.safeParse({
    payrollItemId: formData.get("payrollItemId"),
    method: formData.get("method"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("pay_payroll_item", {
    p_payroll_item_id: parsed.data.payrollItemId,
    p_method: parsed.data.method,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/payroll-payments");
  revalidatePath("/hr/payroll");
  return { success: true };
}
