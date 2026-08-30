"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { adjustLeaveBalanceSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function adjustLeaveBalanceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = adjustLeaveBalanceSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveType: formData.get("leaveType"),
    year: Number(formData.get("year")),
    entitledDays: Number(formData.get("entitledDays")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employee_leave_balances").upsert(
    {
      employee_id: parsed.data.employeeId,
      leave_type: parsed.data.leaveType,
      year: parsed.data.year,
      entitled_days: parsed.data.entitledDays,
    },
    { onConflict: "employee_id,leave_type,year" },
  );
  if (error) return { error: error.message };

  revalidatePath("/hr/leave-balances");
  return { success: true };
}
