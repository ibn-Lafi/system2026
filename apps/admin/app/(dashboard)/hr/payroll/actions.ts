"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { generatePayrollRunSchema, updatePayrollItemDeductionsSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function generatePayrollRunAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = generatePayrollRunSchema.safeParse({
    periodMonth: Number(formData.get("periodMonth")),
    periodYear: Number(formData.get("periodYear")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("generate_payroll_run", {
    p_period_month: parsed.data.periodMonth,
    p_period_year: parsed.data.periodYear,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/payroll");
  revalidatePath("/hr/payroll-payments");
  return { success: true };
}

export async function updatePayrollItemDeductionsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePayrollItemDeductionsSchema.safeParse({
    payrollItemId: formData.get("payrollItemId"),
    deductions: Number(formData.get("deductions")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("update_payroll_item_deductions", {
    p_payroll_item_id: parsed.data.payrollItemId,
    p_deductions: parsed.data.deductions,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/payroll");
  revalidatePath("/hr/payroll-payments");
  return { success: true };
}
