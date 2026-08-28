import { Card, PageHeader, Breadcrumb, MetricCard, LineChart } from "@system2026/ui";
import { formatCurrency, computeDelta } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getProfitSummary } from "../../lib/get-profitability";

const WEEKDAY_LABELS = ["أحد", "إثن", "ثلا", "أرب", "خمس", "جمعة", "سبت"];

type WeekInvoiceRow = { id: string; invoice_date: string; total_amount: number };
type WeekPaymentRow = { payment_date: string; amount: number };
type WeekItemRow = { invoice_id: string; quantity_in_base_unit: number; unit_price: number; cost_price: number };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardHomePage() {
  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    { data: todayInvoices },
    { data: todayPayments },
    { data: yesterdayInvoices },
    { data: yesterdayPayments },
    { data: weekInvoices },
    { data: weekPayments },
    todayProfit,
    yesterdayProfit,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select<"total_amount, status", { total_amount: number; status: string }>("total_amount, status")
      .gte("invoice_date", todayStart.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("payments")
      .select<"amount", { amount: number }>("amount")
      .gte("payment_date", todayStart.toISOString()),
    supabase
      .from("invoices")
      .select<"total_amount, status", { total_amount: number; status: string }>("total_amount, status")
      .gte("invoice_date", yesterdayStart.toISOString())
      .lt("invoice_date", todayStart.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("payments")
      .select<"amount", { amount: number }>("amount")
      .gte("payment_date", yesterdayStart.toISOString())
      .lt("payment_date", todayStart.toISOString()),
    supabase
      .from("invoices")
      .select<"id, invoice_date, total_amount", WeekInvoiceRow>("id, invoice_date, total_amount")
      .gte("invoice_date", weekStart.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("payments")
      .select<"payment_date, amount", WeekPaymentRow>("payment_date, amount")
      .gte("payment_date", weekStart.toISOString()),
    getProfitSummary({ from: todayStart.toISOString() }),
    getProfitSummary({ from: yesterdayStart.toISOString(), to: todayStart.toISOString() }),
  ]);

  const invoiceCount = todayInvoices?.length ?? 0;
  const salesTotal = todayInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) ?? 0;
  const collectionsTotal = todayPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const yesterdayInvoiceCount = yesterdayInvoices?.length ?? 0;
  const yesterdaySalesTotal = yesterdayInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) ?? 0;
  const yesterdayCollectionsTotal = yesterdayPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const weekInvoiceIds = (weekInvoices ?? []).map((inv) => inv.id);
  const { data: weekItems } =
    weekInvoiceIds.length > 0
      ? await supabase
          .from("invoice_items")
          .select<"invoice_id, quantity_in_base_unit, unit_price, cost_price", WeekItemRow>(
            "invoice_id, quantity_in_base_unit, unit_price, cost_price",
          )
          .in("invoice_id", weekInvoiceIds)
      : { data: [] as WeekItemRow[] };

  const invoiceDayById = new Map<string, string>();
  const invoiceCountByDay = new Map<string, number>();
  const salesByDay = new Map<string, number>();
  for (const inv of weekInvoices ?? []) {
    const key = inv.invoice_date.slice(0, 10);
    invoiceDayById.set(inv.id, key);
    invoiceCountByDay.set(key, (invoiceCountByDay.get(key) ?? 0) + 1);
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + inv.total_amount);
  }

  const collectionsByDay = new Map<string, number>();
  for (const p of weekPayments ?? []) {
    const key = p.payment_date.slice(0, 10);
    collectionsByDay.set(key, (collectionsByDay.get(key) ?? 0) + p.amount);
  }

  const profitByDay = new Map<string, number>();
  for (const item of weekItems ?? []) {
    const key = invoiceDayById.get(item.invoice_id);
    if (!key) continue;
    const profit = (item.unit_price - item.cost_price) * item.quantity_in_base_unit;
    profitByDay.set(key, (profitByDay.get(key) ?? 0) + profit);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dayLabels = days.map((d) => WEEKDAY_LABELS[d.getDay()]!);
  const invoiceCountSparkline = days.map((d) => invoiceCountByDay.get(dayKey(d)) ?? 0);
  const salesSparkline = days.map((d) => salesByDay.get(dayKey(d)) ?? 0);
  const collectionsSparkline = days.map((d) => collectionsByDay.get(dayKey(d)) ?? 0);
  const profitSparkline = days.map((d) => profitByDay.get(dayKey(d)) ?? 0);

  const stats = [
    {
      label: "عدد الفواتير اليوم",
      value: invoiceCount.toString(),
      delta: computeDelta(invoiceCount, yesterdayInvoiceCount),
      sparkline: invoiceCountSparkline,
    },
    {
      label: "مبيعات اليوم",
      value: formatCurrency(salesTotal),
      delta: computeDelta(salesTotal, yesterdaySalesTotal),
      sparkline: salesSparkline,
    },
    {
      label: "تحصيلات اليوم",
      value: formatCurrency(collectionsTotal),
      delta: computeDelta(collectionsTotal, yesterdayCollectionsTotal),
      sparkline: collectionsSparkline,
    },
    {
      label: "الربح الصافي اليوم",
      value: formatCurrency(todayProfit.totalProfit),
      delta: computeDelta(todayProfit.totalProfit, yesterdayProfit.totalProfit),
      sparkline: profitSparkline,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الرئيسية"]} />}
        title="الرئيسية"
        subtitle="نظرة سريعة على أداء اليوم مقارنة بالأمس"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} delta={stat.delta} sparkline={stat.sparkline} />
        ))}
      </div>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">المبيعات والربح آخر 7 أيام</h2>
        <LineChart
          series={[
            { label: "المبيعات", color: "hsl(var(--primary))", values: salesSparkline },
            { label: "الربح", color: "hsl(var(--muted-foreground))", values: profitSparkline },
          ]}
          xLabels={dayLabels}
        />
      </Card>
    </div>
  );
}
