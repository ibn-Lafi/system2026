"use server";

import { createSupabaseServerClient } from "@system2026/database/server";
import { submitStoreLeadSchema } from "@system2026/validation";

export type SubmitLeadState = { error?: string; success?: boolean };

// أول عملية كتابة عامة (anon) من المتجر — محكومة بـ RLS صريحة على
// store_leads (INSERT فقط، لا SELECT/UPDATE/DELETE لـ anon). راجع migration
// 20260822160000_store_leads_landing_page.sql.
export async function submitStoreLeadAction(
  _prevState: SubmitLeadState,
  formData: FormData,
): Promise<SubmitLeadState> {
  const parsed = submitStoreLeadSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    desiredStore: formData.get("desiredStore"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("store_leads").insert({
    phone_number: `+966${parsed.data.phoneNumber.slice(1)}`,
    desired_store: parsed.data.desiredStore,
  });

  if (error) return { error: "حدث خطأ، حاول مرة أخرى" };
  return { success: true };
}
