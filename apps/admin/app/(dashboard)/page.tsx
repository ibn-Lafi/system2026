import { Card, PageHeader, Breadcrumb, BarChart } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { InvoiceIcon, WalletIcon, ChartIcon } from "../../components/icons";
import { getProfitSummary } from "../../lib/get-profitability";

const WEEKDAY_LABELS = ["أحد", "إثن", "ثلا", "أرب", "خمس", "جمعة", "سبت"];

export default async function DashboardHomePage() {
  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [{ data: todayInvoices }, { data: todayPayments }, { data: weekInvoices }, todayProfit] = await Promise.all([
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
      .select<"invoice_date, total_amount", { invoice_date: string; total_amount: number }>(
        "invoice_date, total_amount",
      )
      .gte("invoice_date", weekStart.toISOString())
      .neq("status", "cancelled"),
    getProfitSummary({ from: todayStart.toISOString() }),
  ]);

  const invoiceCount = todayInvoices?.length ?? 0;
  const salesTotal = todayInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) ?? 0;
  const collectionsTotal = todayPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const salesByDay = new Map<string, number>();
  for (const inv of weekInvoices ?? []) {
    const day = inv.invoice_date.slice(0, 10);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + inv.total_amount);
  }
  const weekChartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    const value = salesByDay.get(key) ?? 0;
    return {
      label: WEEKDAY_LABELS[date.getDay()]!,
      value,
      displayValue: `${WEEKDAY_LABELS[date.getDay()]}: ${formatCurrency(value)}`,
    };
  });

  const stats = [
    { label: "عدد الفواتير اليوم", value: invoiceCount.toString(), icon: InvoiceIcon },
    { label: "مبيعات اليوم", value: formatCurrency(salesTotal), icon: ChartIcon },
    { label: "تحصيلات اليوم", value: formatCurrency(collectionsTotal), icon: WalletIcon },
    { label: "الربح الصافي اليوم", value: formatCurrency(todayProfit.totalProfit), icon: WalletIcon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الرئيسية"]} />}
        title="الرئيسية"
        subtitle="نظرة سريعة على أداء اليوم"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-card-hover">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <stat.icon className="h-[18px] w-[18px]" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Card>
          <h2 className="mb-4 font-semibold">المبيعات آخر 7 أيام</h2>
          <BarChart data={weekChartData} />
        </Card>
      </div>
    </div>
  );
}
