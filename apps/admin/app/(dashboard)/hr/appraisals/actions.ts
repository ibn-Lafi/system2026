"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createAppraisalSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function createAppraisalAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createAppraisalSchema.safeParse({
    employeeId: formData.get("employeeId"),
    appraisalPeriod: formData.get("appraisalPeriod"),
    score: Number(formData.get("score")),
    strengths: formData.get("strengths") || undefined,
    areasForImprovement: formData.get("areasForImprovement") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("performance_appraisals").insert({
    employee_id: parsed.data.employeeId,
    appraisal_period: parsed.data.appraisalPeriod,
    score: parsed.data.score,
    strengths: parsed.data.strengths ?? null,
    areas_for_improvement: parsed.data.areasForImprovement ?? null,
    reviewed_by: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/appraisals");
  return { success: true };
}
