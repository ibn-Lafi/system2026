import Link from "next/link";
import { Badge, Card, BarList, DateRangePicker, MetricCard, RangeChips, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency, computeDelta } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getProfitSummary } from "../../../lib/get-profitability";
import { getCustomerOutstandingBalances, getSupplierOutstandingBalances } from "../../../lib/get-balances";

type ProductRow = { id: string; name: string; average_cost: number; has_expiry: boolean; expiry_date: string | null };
type WriteOffMovement = { product_id: string; quantity_change: number };
type SettingsRow = { expiry_alert_days_threshold: number };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// نطاق الفترة السابقة بنفس طول الفترة الحالية، للمقارنة (شارة التغيّر على
// بطاقتي المبيعات والربح) — بلا مقارنة إذا كانت "كل الفترات" (لا يوجد "from"
// محدد فيُصبح طول الفترة غير معروف).
function getPreviousPeriodRange(from?: string, to?: string): { from: string; to: string } | null {
  if (!from) return null;
  const fromDate = new Date(from);
  const toDate = to ? new Date(`${to}T23:59:59`) : new Date();
  const lengthMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createSupabaseServerClient();

  const range = {
    from: searchParams.from ? searchParams.from : undefined,
    to: searchParams.to ? `${searchParams.to}T23:59:59` : undefined,
  };
  const previousRange = getPreviousPeriodRange(searchParams.from, searchParams.to);

  const [
    profitSummary,
    previousProfitSummary,
    { data: products },
    { data: writeOffs },
    { data: settings },
    customerDebt,
    supplierPayables,
  ] = await Promise.all([
    getProfitSummary(range),
    previousRange ? getProfitSummary(previousRange) : Promise.resolve(null),
    supabase
      .from("products")
      .select<"id, name, average_cost, has_expiry, expiry_date", ProductRow>(
        "id, name, average_cost, has_expiry, expiry_date",
      ),
    supabase
      .from("stock_movements")
      .select<"product_id, quantity_change", WriteOffMovement>("product_id, quantity_change")
      .eq("movement_type", "write_off"),
    supabase
      .from("system_settings")
      .select<"expiry_alert_days_threshold", SettingsRow>("expiry_alert_days_threshold")
      .eq("id", 1)
      .single(),
    getCustomerOutstandingBalances(),
    getSupplierOutstandingBalances(),
    ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const productCostById = new Map((products ?? []).map((p) => [p.id, p.average_cost]));

  const topProductsByProfit = Array.from(profitSummary.byProduct.entries())
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 10);

  const topProductsByQuantity = Array.from(profitSummary.byProduct.entries())
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10);

  let totalLossValue = 0;
  const lossByProduct = new Map<string, number>();
  for (const movement of writeOffs ?? []) {
    const quantity = Math.abs(movement.quantity_change);
    const cost = productCostById.get(movement.product_id) ?? 0;
    const value = quantity * cost;
    totalLossValue += value;
    lossByProduct.set(movement.product_id, (lossByProduct.get(movement.product_id) ?? 0) + value);
  }

  const thresholdDays = settings?.expiry_alert_days_threshold ?? 30;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);
  const expiringProducts = (products ?? []).filter(
    (p) => p.has_expiry && p.expiry_date && new Date(p.expiry_date) <= thresholdDate,
  );

  const today = startOfToday();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);

  const rangeChipItems = [
    { label: "كل الفترات", href: "/reports", active: !searchParams.from },
    { label: "اليوم", href: `/reports?from=${isoDate(today)}`, active: searchParams.from === isoDate(today) },
    {
      label: "آخر 7 أيام",
      href: `/reports?from=${isoDate(weekAgo)}`,
      active: searchParams.from === isoDate(weekAgo) && !searchParams.to,
    },
    {
      label: "آخر 30 يوم",
      href: `/reports?from=${isoDate(monthAgo)}`,
      active: searchParams.from === isoDate(monthAgo) && !searchParams.to,
    },
  ];

  const salesDelta = previousProfitSummary
    ? computeDelta(profitSummary.totalSales, previousProfitSummary.totalSales)
    : undefined;
  const profitDelta = previousProfitSummary
    ? computeDelta(profitSummary.totalProfit, previousProfitSummary.totalProfit)
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "التقارير"]} />}
        title="التقارير"
        subtitle={
          previousRange ? "أداء المبيعات والربحية والخسائر — مقارنة بالفترة السابقة بنفس الطول" : "أداء المبيعات والربحية والخسائر"
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-foreground/60">الفترة:</span>
          <RangeChips items={rangeChipItems} />
          <form className="flex items-center gap-2 text-sm">
            <DateRangePicker fromName="from" toName="to" defaultFrom={searchParams.from} defaultTo={searchParams.to} />
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              تطبيق
            </button>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="إجمالي المبيعات" value={formatCurrency(profitSummary.totalSales)} delta={salesDelta} />
        <MetricCard label="إجمالي الربح الصافي" value={formatCurrency(profitSummary.totalProfit)} delta={profitDelta} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/customers">
          <MetricCard
            label="ديون العملاء المستحقة"
            value={formatCurrency(customerDebt.totalDebt)}
            footer={<span className="text-xs text-primary underline">فتح صفحة العملاء ←</span>}
          />
        </Link>
        <Link href="/suppliers#dues">
          <MetricCard
            label="مستحقات الموردين"
            value={formatCurrency(supplierPayables.totalDebt)}
            footer={<span className="text-xs text-primary underline">فتح صفحة الموردين ←</span>}
          />
        </Link>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">أفضل المنتجات مبيعًا (بالكمية)</h2>
        {topProductsByQuantity.length > 0 ? (
          <BarList
            items={topProductsByQuantity.map(([productId, stats]) => ({
              label: productNameById.get(productId) ?? "—",
              value: stats.quantity,
              displayValue: `${stats.quantity} — ${formatCurrency(stats.sales)}`,
            }))}
          />
        ) : (
          <p className="text-sm text-foreground/60">لا توجد بيانات لهذه الفترة</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">أفضل المنتجات ربحًا</h2>
        {topProductsByProfit.length > 0 ? (
          <BarList
            items={topProductsByProfit.map(([productId, stats]) => ({
              label: productNameById.get(productId) ?? "—",
              value: stats.profit,
              displayValue: formatCurrency(stats.profit),
            }))}
          />
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تفاصيل أفضل المنتجات ربحًا</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">المنتج</th>
                <th>الكمية المباعة</th>
                <th>المبيعات</th>
                <th>الربح</th>
                <th>هامش الربح</th>
              </tr>
            </thead>
            <tbody>
              {topProductsByProfit.map(([productId, stats]) => (
                <tr key={productId} className="border-b border-border/50">
                  <td className="py-2">{productNameById.get(productId) ?? "—"}</td>
                  <td>{stats.quantity}</td>
                  <td>{formatCurrency(stats.sales)}</td>
                  <td>{formatCurrency(stats.profit)}</td>
                  <td>{stats.sales > 0 ? `${((stats.profit / stats.sales) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topProductsByProfit.length === 0 ? <p className="py-4 text-foreground/60">لا توجد بيانات لهذه الفترة</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تقرير الخسائر (تالف/منتهي الصلاحية)</h2>
        <p className="mb-4 text-sm text-foreground/60">
          إجمالي قيمة الخسائر بسعر التكلفة (كل الفترات):{" "}
          <span className="font-bold">{formatCurrency(totalLossValue)}</span>
        </p>
        {lossByProduct.size > 0 ? (
          <div className="mb-5">
            <BarList
              items={Array.from(lossByProduct.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([productId, value]) => ({
                  label: productNameById.get(productId) ?? "—",
                  value,
                  displayValue: formatCurrency(value),
                }))}
            />
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">المنتج</th>
                <th>قيمة الخسارة</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(lossByProduct.entries()).map(([productId, value]) => (
                <tr key={productId} className="border-b border-border/50">
                  <td className="py-2">{productNameById.get(productId) ?? "—"}</td>
                  <td>{formatCurrency(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lossByProduct.size === 0 ? <p className="py-4 text-foreground/60">لا توجد خسائر مسجّلة</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تقرير قرب انتهاء الصلاحية (خلال {thresholdDays} يوم)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">المنتج</th>
                <th>تاريخ الانتهاء</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {expiringProducts.map((p) => {
                const daysLeft = p.expiry_date
                  ? Math.ceil((new Date(p.expiry_date).getTime() - today.getTime()) / 86400000)
                  : null;
                return (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2">{p.name}</td>
                    <td>{p.expiry_date}</td>
                    <td>
                      {daysLeft !== null ? (
                        <Badge variant={daysLeft <= 7 ? "danger" : "warning"}>
                          {daysLeft <= 0 ? "منتهية" : `${daysLeft} يوم`}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {expiringProducts.length === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد منتجات قريبة من الانتهاء</p>
        ) : null}
      </Card>
    </div>
  );
}
