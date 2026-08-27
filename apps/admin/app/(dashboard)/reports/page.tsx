import Link from "next/link";
import { Badge, Card, BarList, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
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

  const [profitSummary, { data: products }, { data: writeOffs }, { data: settings }, customerDebt, supplierPayables] =
    await Promise.all([
      getProfitSummary(range),
      supabase
        .from("products")
        .select<
          "id, name, average_cost, has_expiry, expiry_date",
          ProductRow
        >("id, name, average_cost, has_expiry, expiry_date"),
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

  const periodLinkClass =
    "inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted";

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "التقارير"]} />}
        title="التقارير"
        subtitle="أداء المبيعات والربحية والخسائر"
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-foreground/60">الفترة:</span>
          <Link href="/reports" className={periodLinkClass}>
            كل الفترات
          </Link>
          <Link href={`/reports?from=${isoDate(today)}`} className={periodLinkClass}>
            اليوم
          </Link>
          <Link href={`/reports?from=${isoDate(weekAgo)}`} className={periodLinkClass}>
            آخر 7 أيام
          </Link>
          <Link href={`/reports?from=${isoDate(monthAgo)}`} className={periodLinkClass}>
            آخر 30 يوم
          </Link>
          <form className="flex items-center gap-2 text-sm">
            <input
              type="date"
              name="from"
              defaultValue={searchParams.from ?? ""}
              className="h-9 rounded-full border border-border bg-background px-3 text-sm"
            />
            <span className="text-foreground/50">إلى</span>
            <input
              type="date"
              name="to"
              defaultValue={searchParams.to ?? ""}
              className="h-9 rounded-full border border-border bg-background px-3 text-sm"
            />
            <button type="submit" className={periodLinkClass}>
              تطبيق
            </button>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-foreground/60">إجمالي المبيعات</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(profitSummary.totalSales)}</p>
        </Card>
        <Card>
          <p className="text-sm text-foreground/60">إجمالي الربح الصافي</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(profitSummary.totalProfit)}</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/customers">
          <Card className="hover:shadow-card-hover">
            <p className="text-sm text-foreground/60">ديون العملاء المستحقة</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(customerDebt.totalDebt)}</p>
            <p className="mt-1 text-xs text-primary underline">فتح صفحة العملاء ←</p>
          </Card>
        </Link>
        <Link href="/suppliers#dues">
          <Card className="hover:shadow-card-hover">
            <p className="text-sm text-foreground/60">مستحقات الموردين</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(supplierPayables.totalDebt)}</p>
            <p className="mt-1 text-xs text-primary underline">فتح صفحة الموردين ←</p>
          </Card>
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
