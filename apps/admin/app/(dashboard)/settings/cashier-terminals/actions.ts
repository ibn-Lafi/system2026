"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { cashierTerminalSchema, resetCashierTerminalPinSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function createCashierTerminalAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cashierTerminalSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("create_cashier_terminal", {
    p_name: parsed.data.name,
    p_pin: parsed.data.pin,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/cashier-terminals");
  return { success: true };
}

export async function resetCashierTerminalPinAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetCashierTerminalPinSchema.safeParse({
    terminalId: formData.get("terminalId"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("reset_cashier_terminal_pin", {
    p_terminal_id: parsed.data.terminalId,
    p_pin: parsed.data.pin,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/cashier-terminals");
  return { success: true };
}

export async function setCashierTerminalActiveAction(formData: FormData): Promise<void> {
  const terminalId = formData.get("terminalId");
  const isActive = formData.get("isActive") === "true";
  if (typeof terminalId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.rpc("set_cashier_terminal_active", { p_terminal_id: terminalId, p_is_active: isActive });

  revalidatePath("/settings/cashier-terminals");
}
