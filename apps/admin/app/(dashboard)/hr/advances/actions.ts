"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  createAdvanceSchema,
  updateAdvanceStatusSchema,
  createCustodyItemSchema,
  returnCustodyItemSchema,
} from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function createAdvanceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createAdvanceSchema.safeParse({
    employeeId: formData.get("employeeId"),
    amount: Number(formData.get("amount")),
    reason: formData.get("reason") || undefined,
    monthlyDeductionAmount: Number(formData.get("monthlyDeductionAmount") || 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employee_advances").insert({
    employee_id: parsed.data.employeeId,
    amount: parsed.data.amount,
    reason: parsed.data.reason ?? null,
    monthly_deduction_amount: parsed.data.monthlyDeductionAmount,
    remaining_balance: parsed.data.amount,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/advances");
  return { success: true };
}

export async function updateAdvanceStatusAction(formData: FormData): Promise<void> {
  const parsed = updateAdvanceStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  await supabase.from("employee_advances").update({ status: parsed.data.status }).eq("id", parsed.data.id);

  revalidatePath("/hr/advances");
}

export async function createCustodyItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createCustodyItemSchema.safeParse({
    employeeId: formData.get("employeeId"),
    itemName: formData.get("itemName"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employee_custody_items").insert({
    employee_id: parsed.data.employeeId,
    item_name: parsed.data.itemName,
    description: parsed.data.description ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/advances");
  return { success: true };
}

export async function returnCustodyItemAction(formData: FormData): Promise<void> {
  const parsed = returnCustodyItemSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  await supabase
    .from("employee_custody_items")
    .update({ status: "returned", returned_date: new Date().toISOString().slice(0, 10) })
    .eq("id", parsed.data.id);

  revalidatePath("/hr/advances");
}
