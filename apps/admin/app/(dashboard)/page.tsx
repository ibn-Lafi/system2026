import Link from "next/link";
import {
  Card,
  HorizontalBarChart,
  StackedBarChart,
  CHART_CATEGORICAL_COLORS,
  MetricCard,
  RangeChips,
  PageHeader,
  Breadcrumb,
} from "@system2026/ui";
import { formatCurrency, computeDelta } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../lib/get-current-role";
import { hasPermission } from "../../lib/permissions";
import { getProfitSummary } from "../../lib/get-profitability";
import { getCustomerOutstandingBalances, getSupplierOutstandingBalances } from "../../lib/get-balances";

type RangeInvoiceRow = { status: string; payment_method: string };

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  credit: "آجل",
  check: "شيك",
  transfer: "تحويل",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// نطاق الفترة السابقة بنفس طول الفترة الحالية، للمقارنة (شارة التغيّر على
// بطاقتي المبيعات والربح).
function getPreviousPeriodRange(from?: string): { from: string; to: string } | null {
  if (!from) return null;
  const fromDate = new Date(from);
  const toDate = new Date();
  const lengthMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

// الرئيسية = لوحة مؤشرات سريعة (KPIs + رسوم بيانية) بفترات جاهزة فقط —
// اختيار فترة مخصّصة وتفاصيل كل تقرير على حدة (جداول، تنزيل ملف) انتقلت
// لصفحة "التقارير" المخصّصة لذلك حصرًا.
export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const role = await getCurrentUserRole();
  const canViewReports = hasPermission(role, "view_reports");

  const now = new Date();
  const dateLabel = now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (!canViewReports) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumb={<Breadcrumb items={["لوحة التحكم", "الرئيسية"]} />}
          title="الرئيسية"
          subtitle="مرحبًا بك في لوحة تحكم سبعة"
        />
        <Card>
          <p className="text-sm text-foreground/60">{dateLabel}</p>
          <p className="mt-2">استخدم القائمة الجانبية للوصول لأقسام النظام المتاحة لك.</p>
        </Card>
      </div>
    );
  }

  const supabase = createSupabaseServerClient();
  const range = { from: searchParams.from };
  const previousRange = getPreviousPeriodRange(searchParams.from);

  let rangeInvoicesQuery = supabase.from("invoices").select<"status, payment_method", RangeInvoiceRow>(
    "status, payment_method",
  );
  if (range.from) rangeInvoicesQuery = rangeInvoicesQuery.gte("invoice_date", range.from);

  const [profitSummary, previousProfitSummary, customerDebt, supplierPayables, { data: rangeInvoices }] =
    await Promise.all([
      getProfitSummary(range),
      previousRange ? getProfitSummary(previousRange) : Promise.resolve(null),
      getCustomerOutstandingBalances(),
      getSupplierOutstandingBalances(),
      rangeInvoicesQuery,
    ]);

  const paymentMethodCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  for (const inv of rangeInvoices ?? []) {
    paymentMethodCounts.set(inv.payment_method, (paymentMethodCounts.get(inv.payment_method) ?? 0) + 1);
    statusCounts.set(inv.status, (statusCounts.get(inv.status) ?? 0) + 1);
  }
  const paymentMethodSegments = Object.keys(PAYMENT_METHOD_LABELS).map((key, i) => ({
    label: PAYMENT_METHOD_LABELS[key]!,
    value: paymentMethodCounts.get(key) ?? 0,
    color: CHART_CATEGORICAL_COLORS[i % CHART_CATEGORICAL_COLORS.length]!,
  }));
  const statusSegments = Object.keys(INVOICE_STATUS_LABELS).map((key, i) => ({
    label: INVOICE_STATUS_LABELS[key]!,
    value: statusCounts.get(key) ?? 0,
    color: CHART_CATEGORICAL_COLORS[i % CHART_CATEGORICAL_COLORS.length]!,
  }));
  const hasRangeInvoices = (rangeInvoices?.length ?? 0) > 0;

  const productNameById = new Map<string, string>();
  {
    const productIds = Array.from(profitSummary.byProduct.keys());
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select<"id, name", { id: string; name: string }>("id, name")
        .in("id", productIds);
      for (const p of products ?? []) productNameById.set(p.id, p.name);
    }
  }

  const topProductsByQuantity = Array.from(profitSummary.byProduct.entries())
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10);
  const topProductsByProfit = Array.from(profitSummary.byProduct.entries())
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 10);

  const today = startOfToday();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);

  const rangeChipItems = [
    { label: "كل الفترات", href: "/", active: !searchParams.from },
    { label: "اليوم", href: `/?from=${isoDate(today)}`, active: searchParams.from === isoDate(today) },
    { label: "آخر 7 أيام", href: `/?from=${isoDate(weekAgo)}`, active: searchParams.from === isoDate(weekAgo) },
    { label: "آخر 30 يوم", href: `/?from=${isoDate(monthAgo)}`, active: searchParams.from === isoDate(monthAgo) },
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
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الرئيسية"]} />}
        title="الرئيسية"
        subtitle={dateLabel}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-foreground/60">الفترة:</span>
          <RangeChips items={rangeChipItems} />
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
          <HorizontalBarChart
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
          <HorizontalBarChart
            items={topProductsByProfit.map(([productId, stats]) => ({
              label: productNameById.get(productId) ?? "—",
              value: stats.profit,
              displayValue: formatCurrency(stats.profit),
            }))}
          />
        ) : (
          <p className="text-sm text-foreground/60">لا توجد بيانات لهذه الفترة</p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">توزيع الفواتير حسب طريقة الدفع</h2>
          {hasRangeInvoices ? (
            <StackedBarChart segments={paymentMethodSegments} />
          ) : (
            <p className="text-sm text-foreground/60">لا توجد فواتير لهذه الفترة</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">توزيع الفواتير حسب الحالة</h2>
          {hasRangeInvoices ? (
            <StackedBarChart segments={statusSegments} />
          ) : (
            <p className="text-sm text-foreground/60">لا توجد فواتير لهذه الفترة</p>
          )}
        </Card>
      </div>

      <Card>
        <p className="text-sm text-foreground/60">
          تحتاج تفاصيل أدق (فواتير، خسائر، قرب انتهاء الصلاحية...) أو ملف قابل للتنزيل؟{" "}
          <Link href="/reports" className="font-medium text-primary underline">
            افتح صفحة التقارير
          </Link>
        </p>
      </Card>
    </div>
  );
}
