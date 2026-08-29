"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { calculateEndOfServiceSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function calculateEndOfServiceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = calculateEndOfServiceSchema.safeParse({
    employeeId: formData.get("employeeId"),
    terminationDate: formData.get("terminationDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("calculate_end_of_service", {
    p_employee_id: parsed.data.employeeId,
    p_termination_date: parsed.data.terminationDate,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/end-of-service");
  revalidatePath("/hr/employees");
  return { success: true };
}
