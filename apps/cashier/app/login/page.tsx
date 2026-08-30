import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { CashierLoginForm } from "./login-form";

export default async function CashierLoginPage() {
  const supabase = createSupabaseAdminClient();
  const { data: employees } = await supabase
    .from("employees")
    .select<"id, full_name", { id: string; full_name: string }>("id, full_name")
    .eq("is_cashier", true)
    .eq("is_active", true)
    .order("full_name");

  return <CashierLoginForm employees={(employees ?? []).map((e) => ({ id: e.id, name: e.full_name }))} />;
}
