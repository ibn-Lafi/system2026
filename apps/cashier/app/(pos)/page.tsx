import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { CASHIER_SESSION_COOKIE, verifySessionToken } from "../../lib/session";
import { PosScreen, type PosProduct } from "./pos-screen";

export default async function PosPage() {
  const session = await verifySessionToken(cookies().get(CASHIER_SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const supabase = createSupabaseAdminClient();

  type ProductRow = { id: string; name: string; price: number; image_url: string | null };
  type StockRow = { product_id: string; quantity_available: number };

  const [{ data: products }, { data: stock }, { data: employee }] = await Promise.all([
    supabase.from("products").select<"id, name, price, image_url", ProductRow>("id, name, price, image_url").order("name"),
    supabase.from("warehouse_stock").select<"product_id, quantity_available", StockRow>("product_id, quantity_available"),
    supabase
      .from("employees")
      .select<"full_name", { full_name: string }>("full_name")
      .eq("id", session.employeeId)
      .single(),
  ]);

  const stockByProduct = new Map((stock ?? []).map((s) => [s.product_id, s.quantity_available]));
  const posProducts: PosProduct[] = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.image_url,
    available: stockByProduct.get(p.id) ?? 0,
  }));

  return <PosScreen products={posProducts} employeeName={employee?.full_name ?? "الكاشير"} />;
}
