"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createLeaveRequestSchema, reviewLeaveRequestSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function createLeaveRequestAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createLeaveRequestSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    daysCount: Number(formData.get("daysCount")),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("leave_requests").insert({
    employee_id: parsed.data.employeeId,
    leave_type: parsed.data.leaveType,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    days_count: parsed.data.daysCount,
    reason: parsed.data.reason ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/leaves");
  return { success: true };
}

export async function approveLeaveRequestAction(formData: FormData): Promise<void> {
  const parsed = reviewLeaveRequestSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  await supabase.rpc("approve_leave_request", { p_leave_request_id: parsed.data.id });

  revalidatePath("/hr/leaves");
  revalidatePath("/hr/leave-balances");
}

export async function rejectLeaveRequestAction(formData: FormData): Promise<void> {
  const parsed = reviewLeaveRequestSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  await supabase.rpc("reject_leave_request", { p_leave_request_id: parsed.data.id });

  revalidatePath("/hr/leaves");
}
