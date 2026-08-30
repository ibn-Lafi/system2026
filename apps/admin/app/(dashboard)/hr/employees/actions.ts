"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createEmployeeSchema, updateEmployeeSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

function readEmployeeFields(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    nationalId: formData.get("nationalId") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    jobTitle: formData.get("jobTitle") || undefined,
    department: formData.get("department") || undefined,
    hireDate: formData.get("hireDate"),
    shiftId: formData.get("shiftId") || undefined,
    basicSalary: Number(formData.get("basicSalary") || 0),
    housingAllowance: Number(formData.get("housingAllowance") || 0),
    otherAllowances: Number(formData.get("otherAllowances") || 0),
  };
}

export async function createEmployeeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createEmployeeSchema.safeParse(readEmployeeFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employees").insert({
    full_name: parsed.data.fullName,
    national_id: parsed.data.nationalId ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email || null,
    job_title: parsed.data.jobTitle ?? null,
    department: parsed.data.department ?? null,
    hire_date: parsed.data.hireDate,
    shift_id: parsed.data.shiftId ?? null,
    basic_salary: parsed.data.basicSalary,
    housing_allowance: parsed.data.housingAllowance,
    other_allowances: parsed.data.otherAllowances,
  });
  if (error) return { error: error.message };

  revalidatePath("/hr/employees");
  return { success: true };
}

export async function updateEmployeeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateEmployeeSchema.safeParse({
    ...readEmployeeFields(formData),
    id: formData.get("id"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({
      full_name: parsed.data.fullName,
      national_id: parsed.data.nationalId ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      job_title: parsed.data.jobTitle ?? null,
      department: parsed.data.department ?? null,
      hire_date: parsed.data.hireDate,
      shift_id: parsed.data.shiftId ?? null,
      basic_salary: parsed.data.basicSalary,
      housing_allowance: parsed.data.housingAllowance,
      other_allowances: parsed.data.otherAllowances,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/hr/employees");
  return { success: true };
}
