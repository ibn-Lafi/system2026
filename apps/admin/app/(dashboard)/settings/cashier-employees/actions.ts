"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { cashierEmployeeSchema, resetCashierEmployeePinSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function createCashierEmployeeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cashierEmployeeSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("create_cashier_employee", {
    p_name: parsed.data.name,
    p_pin: parsed.data.pin,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/cashier-employees");
  return { success: true };
}

export async function resetCashierEmployeePinAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetCashierEmployeePinSchema.safeParse({
    employeeId: formData.get("employeeId"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("reset_cashier_employee_pin", {
    p_employee_id: parsed.data.employeeId,
    p_pin: parsed.data.pin,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/cashier-employees");
  return { success: true };
}

export async function setCashierEmployeeActiveAction(formData: FormData): Promise<void> {
  const employeeId = formData.get("employeeId");
  const isActive = formData.get("isActive") === "true";
  if (typeof employeeId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.rpc("set_cashier_employee_active", { p_employee_id: employeeId, p_is_active: isActive });

  revalidatePath("/settings/cashier-employees");
}
