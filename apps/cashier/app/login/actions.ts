"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pinLoginSchema } from "@system2026/validation";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { CASHIER_SESSION_COOKIE, createSessionToken } from "../../lib/session";

export type LoginActionState = { error?: string };

export async function verifyPinAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = pinLoginSchema.safeParse({
    employeeId: formData.get("employeeId"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { error: "اختر اسمك وأدخل رمز PIN صحيح" };

  const supabase = createSupabaseAdminClient();
  const { data: isValid, error } = await supabase.rpc("verify_cashier_employee_pin", {
    p_employee_id: parsed.data.employeeId,
    p_pin: parsed.data.pin,
  });
  if (error || !isValid) return { error: "رمز PIN غير صحيح" };

  const token = await createSessionToken(parsed.data.employeeId);
  cookies().set(CASHIER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/");
}
