"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createAttendanceRecordSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

function toTimestamp(workDate: string, time?: string) {
  if (!time) return null;
  return new Date(`${workDate}T${time}:00`).toISOString();
}

export async function recordAttendanceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createAttendanceRecordSchema.safeParse({
    employeeId: formData.get("employeeId"),
    workDate: formData.get("workDate"),
    checkIn: formData.get("checkIn") || undefined,
    checkOut: formData.get("checkOut") || undefined,
    status: formData.get("status") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("attendance_records")
    .upsert(
      {
        employee_id: parsed.data.employeeId,
        work_date: parsed.data.workDate,
        check_in: toTimestamp(parsed.data.workDate, parsed.data.checkIn),
        check_out: toTimestamp(parsed.data.workDate, parsed.data.checkOut),
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "employee_id,work_date" },
    );
  if (error) return { error: error.message };

  revalidatePath("/hr/attendance");
  return { success: true };
}
