"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createShiftSchema, updateShiftSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function createShiftAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createShiftSchema.safeParse({
    name: formData.get("name"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("shifts").insert({
    name: parsed.data.name,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/shifts");
  return { success: true };
}

export async function updateShiftAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateShiftSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("shifts")
    .update({ name: parsed.data.name, start_time: parsed.data.startTime, end_time: parsed.data.endTime })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/hr/shifts");
  return { success: true };
}
