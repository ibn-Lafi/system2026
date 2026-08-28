import Link from "next/link";
import { Button, Card, DateRangePicker, LinkButton, MetricCard, RangeChips, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";

type InvoiceRow = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  total_amount: number;
  payment_method: string;
  status: string;
  customer_id: string;
  discount_percentage: number;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقدًا",
  credit: "آجل",
  check: "شيك",
  transfer: "تحويل",
};

type InvoiceSearchParams = {
  customerId?: string;
  status?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

// روابط تحافظ على باقي الفلاتر الحالية وتغيّر/تحذف فقط المفاتيح الممرّرة
function buildHref(current: InvoiceSearchParams, overrides: Partial<InvoiceSearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/invoices?${qs}` : "/invoices";
}

export default async function InvoicesPage({ searchParams }: { searchParams: InvoiceSearchParams }) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, total_amount, payment_method, status, customer_id, discount_percentage",
      InvoiceRow
    >("id, invoice_number, invoice_date, total_amount, payment_method, status, customer_id, discount_percentage")
    .order("invoice_number", { ascending: false })
    .limit(100);

  if (searchParams.customerId) query = query.eq("customer_id", searchParams.customerId);
  if (searchParams.status) {
    query = query.eq("status", searchParams.status as "paid" | "partial" | "unpaid" | "cancelled");
  }
  if (searchParams.paymentMethod) {
    query = query.eq("payment_method", searchParams.paymentMethod as "cash" | "credit" | "check" | "transfer");
  }
  if (searchParams.from) query = query.gte("invoice_date", searchParams.from);
  if (searchParams.to) query = query.lte("invoice_date", `${searchParams.to}T23:59:59`);

  // استعلام مؤشرات منفصل بلا limit(100) الخاص بجدول العرض — لضمان أن
  // البطاقات (العدد/الإجمالي) تعكس كل الفواتير المطابقة للفلاتر فعليًا، وليس
  // فقط أول 100 صف معروض بالجدول.
  let statsQuery = supabase.from("invoices").select<"total_amount, status", { total_amount: number; status: string }>(
    "total_amount, status",
  );
  if (searchParams.customerId) statsQuery = statsQuery.eq("customer_id", searchParams.customerId);
  if (searchParams.status) {
    statsQuery = statsQuery.eq("status", searchParams.status as "paid" | "partial" | "unpaid" | "cancelled");
  }
  if (searchParams.paymentMethod) {
    statsQuery = statsQuery.eq(
      "payment_method",
      searchParams.paymentMethod as "cash" | "credit" | "check" | "transfer",
    );
  }
  if (searchParams.from) statsQuery = statsQuery.gte("invoice_date", searchParams.from);
  if (searchParams.to) statsQuery = statsQuery.lte("invoice_date", `${searchParams.to}T23:59:59`);

  const [{ data: invoices }, { data: customers }, { data: statsInvoices }] = await Promise.all([
    query,
    supabase
      .from("customers")
      .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
        "id, name, shop_name",
      ),
    statsQuery,
  ]);

  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));

  const matchingCount = statsInvoices?.length ?? 0;
  const nonCancelled = (statsInvoices ?? []).filter((inv) => inv.status !== "cancelled");
  const salesTotal = nonCancelled.reduce((sum, inv) => sum + inv.total_amount, 0);
  const averageInvoice = nonCancelled.length > 0 ? salesTotal / nonCancelled.length : 0;
  const unpaidOrPartialCount = (statsInvoices ?? []).filter(
    (inv) => inv.status === "unpaid" || inv.status === "partial",
  ).length;

  const now = new Date();
  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const todayStr = toDateInput(now);

  const QUICK_RANGES = [
    { label: "آخر 7 أيام", from: toDateInput(last7Days), to: todayStr },
    { label: "هذا الشهر", from: toDateInput(startOfMonth), to: todayStr },
    { label: "هذه السنة", from: toDateInput(startOfYear), to: todayStr },
  ];

  const STATUS_FILTERS: { label: string; value?: string }[] = [
    { label: "الكل", value: undefined },
    { label: "مدفوعة", value: "paid" },
    { label: "جزئي", value: "partial" },
    { label: "غير مدفوعة", value: "unpaid" },
    { label: "ملغاة", value: "cancelled" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الفواتير"]} />}
        title="الفواتير"
        subtitle="كل فواتير البيع — تسجيل المرتجعات والتحصيلات متاح الآن من صفحة العملاء"
        actions={<LinkButton href="/invoice-requests">طلبات تعديل الفواتير</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="عدد الفواتير" value={matchingCount.toString()} />
        <MetricCard label="إجمالي المبيعات" value={formatCurrency(salesTotal)} />
        <MetricCard label="متوسط الفاتورة" value={formatCurrency(averageInvoice)} />
        <MetricCard label="غير مسددة/جزئي" value={unpaidOrPartialCount.toString()} />
      </div>

      <Card>
        <div className="mb-4">
          <RangeChips
            items={STATUS_FILTERS.map((s) => ({
              label: s.label,
              href: buildHref(searchParams, { status: s.value }),
              active: (searchParams.status ?? "") === (s.value ?? ""),
            }))}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <RangeChips
            items={QUICK_RANGES.map((r) => ({
              label: r.label,
              href: buildHref(searchParams, { from: r.from, to: r.to }),
              active: searchParams.from === r.from && searchParams.to === r.to,
            }))}
          />
          {searchParams.from || searchParams.to ? (
            <Link
              href={buildHref(searchParams, { from: undefined, to: undefined })}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              مسح الفترة
            </Link>
          ) : null}
        </div>

        <form className="mb-4 flex flex-wrap items-end gap-3 text-sm">
          <Select name="customerId" defaultValue={searchParams.customerId ?? ""} className="w-auto">
            <option value="">كل العملاء</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.shop_name ?? c.name}
              </option>
            ))}
          </Select>
          <Select name="paymentMethod" defaultValue={searchParams.paymentMethod ?? ""} className="w-auto">
            <option value="">كل طرق الدفع</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <DateRangePicker fromName="from" toName="to" defaultFrom={searchParams.from} defaultTo={searchParams.to} />
          {searchParams.status ? <input type="hidden" name="status" value={searchParams.status} /> : null}
          <Button type="submit" variant="outline">
            فلترة
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>الإجمالي</th>
                <th>نسبة الخصم</th>
                <th>الدفع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="py-2">
                    <Link href={`/invoices/${inv.id}`} className="text-primary underline">
                      #{inv.invoice_number}
                    </Link>
                  </td>
                  <td>{new Date(inv.invoice_date).toLocaleString("ar-SA")}</td>
                  <td>{customerNameById.get(inv.customer_id) ?? "—"}</td>
                  <td>{formatCurrency(inv.total_amount)}</td>
                  <td>{inv.discount_percentage > 0 ? `${inv.discount_percentage}%` : "—"}</td>
                  <td>{PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method}</td>
                  <td>{STATUS_LABELS[inv.status] ?? inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(invoices?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد فواتير بعد</p> : null}
      </Card>
    </div>
  );
}
