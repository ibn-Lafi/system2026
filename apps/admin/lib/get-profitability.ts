import { createSupabaseServerClient } from "@system2026/database/server";

type InvoiceRow = { id: string; status: string };
type InvoiceItemRow = {
  invoice_id: string;
  product_id: string;
  quantity_in_base_unit: number;
  unit_price: number;
  cost_price: number;
};

export type ProfitSummary = {
  byProduct: Map<string, { sales: number; profit: number; quantity: number }>;
  totalSales: number;
  totalProfit: number;
};

export type ProfitDateRange = { from?: string; to?: string };

// الربح لكل بند = (سعر البيع - سعر التكلفة المحفوظ وقت البيع) × الكمية —
// راجع requirements.md §9.1. مُستبعدة الفواتير الملغاة (Credit Note يصفّر أثرها).
// range اختياري لحصر الحساب بفترة زمنية (راجع §9.2 "الربح الصافي... خلال فترة").
export async function getProfitSummary(range?: ProfitDateRange): Promise<ProfitSummary> {
  const supabase = createSupabaseServerClient();

  let invoiceQuery = supabase
    .from("invoices")
    .select<"id, status", InvoiceRow>("id, status")
    .neq("status", "cancelled");
  if (range?.from) invoiceQuery = invoiceQuery.gte("invoice_date", range.from);
  if (range?.to) invoiceQuery = invoiceQuery.lte("invoice_date", range.to);

  const { data: invoices } = await invoiceQuery;
  const invoiceIds = (invoices ?? []).map((inv) => inv.id);

  const { data: items } =
    invoiceIds.length > 0
      ? await supabase
          .from("invoice_items")
          .select<
            "invoice_id, product_id, quantity_in_base_unit, unit_price, cost_price",
            InvoiceItemRow
          >("invoice_id, product_id, quantity_in_base_unit, unit_price, cost_price")
          .in("invoice_id", invoiceIds)
      : { data: [] as InvoiceItemRow[] };

  const byProduct = new Map<string, { sales: number; profit: number; quantity: number }>();
  let totalSales = 0;
  let totalProfit = 0;

  for (const item of items ?? []) {
    const sale = item.unit_price * item.quantity_in_base_unit;
    const profit = (item.unit_price - item.cost_price) * item.quantity_in_base_unit;

    totalSales += sale;
    totalProfit += profit;

    const productEntry = byProduct.get(item.product_id) ?? { sales: 0, profit: 0, quantity: 0 };
    productEntry.sales += sale;
    productEntry.profit += profit;
    productEntry.quantity += item.quantity_in_base_unit;
    byProduct.set(item.product_id, productEntry);
  }

  return { byProduct, totalSales, totalProfit };
}
