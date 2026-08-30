import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { CashierLoginForm } from "./login-form";

export default async function CashierLoginPage() {
  const supabase = createSupabaseAdminClient();
  const { data: employees } = await supabase
    .from("cashier_employees")
    .select<"id, name", { id: string; name: string }>("id, name")
    .eq("is_active", true)
    .order("name");

  return <CashierLoginForm employees={employees ?? []} />;
}
