import { cookies } from "next/headers";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { logoutStoreCustomerAction } from "../actions";

type CustomerRow = { name: string; phone: string | null; loyalty_points: number };
type InvoiceRow = { id: string; invoice_number: number; invoice_date: string; total_amount: number; status: string };

const STATUS_LABELS: Record<string, string> = { unpaid: "بانتظار الدفع", paid: "مدفوعة", cancelled: "ملغاة" };

export default async function AccountPage() {
  const customerId = cookies().get("store_customer_id")?.value;

  if (!customerId) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="text-xl font-black">حسابي</h1>
        <p className="mt-2 text-foreground/60">لم يتم التعرّف عليك بعد — أضف منتجًا للسلة وأكمل الطلب لإنشاء حسابك</p>
      </main>
    );
  }

  const supabase = createSupabaseServerClient();
  const [{ data: customer }, { data: invoices }] = await Promise.all([
    supabase
      .from("customers")
      .select<"name, phone, loyalty_points", CustomerRow>("name, phone, loyalty_points")
      .eq("id", customerId)
      .single(),
    supabase
      .from("invoices")
      .select<"id, invoice_number, invoice_date, total_amount, status", InvoiceRow>(
        "id, invoice_number, invoice_date, total_amount, status",
      )
      .eq("customer_id", customerId)
      .eq("sale_channel", "online_store")
      .order("invoice_date", { ascending: false }),
  ]);

  if (!customer) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-foreground/60">تعذّر تحميل بيانات الحساب</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-16 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-black">حسابي</h1>
        <form action={logoutStoreCustomerAction}>
          <button type="submit" className="text-sm font-bold text-foreground/60 underline underline-offset-2">
            تسجيل خروج
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border p-5">
        <p className="font-bold">{customer.name}</p>
        <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
          {customer.phone}
        </p>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">رصيد نقاط الولاء</p>
          <p className="text-2xl font-black">{customer.loyalty_points}</p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-bold">طلباتي</h2>
      <div className="space-y-3">
        {(invoices ?? []).map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-border p-4 text-sm">
            <div>
              <p className="font-bold">طلب رقم {invoice.invoice_number}</p>
              <p className="text-xs text-muted-foreground">{new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}</p>
            </div>
            <div className="text-left">
              <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[invoice.status] ?? invoice.status}</p>
            </div>
          </div>
        ))}
        {(invoices?.length ?? 0) === 0 ? <p className="text-sm text-foreground/60">لا توجد طلبات بعد</p> : null}
      </div>
    </main>
  );
}
