import { redirect } from "next/navigation";
import { Card, DateRangePicker, PageHeader, Select } from "@system2026/ui";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";

const REPORT_TYPES = [
  { value: "profitability", label: "الربحية حسب المنتج (كمية، مبيعات، ربح)", periodBased: true },
  { value: "invoices", label: "الفواتير التفصيلية", periodBased: true },
  { value: "losses", label: "الخسائر (تالف / منتهي الصلاحية)", periodBased: true },
  { value: "receivables", label: "ديون العملاء المستحقة حاليًا", periodBased: false },
  { value: "payables", label: "مستحقات الموردين حاليًا", periodBased: false },
  { value: "expiry", label: "المنتجات قرب انتهاء الصلاحية", periodBased: false },
] as const;

// صفحة التقارير مخصّصة حصرًا لتوليد وتنزيل ملف تقرير (CSV) — اختيار نوع
// التقرير والفترة، ثم تنزيل مباشر. المؤشرات والرسوم البيانية (لمحة سريعة)
// انتقلت للرئيسية.
export default async function ReportsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "view_reports")) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
      />

      <Card>
        <form action="/api/reports/download" method="GET" className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">نوع التقرير</label>
            <Select name="type" defaultValue={REPORT_TYPES[0].value} required>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm">الفترة (تُتجاهل لتقارير: الديون/المستحقات/قرب الانتهاء — دائمًا حسب الوضع الحالي)</label>
            <DateRangePicker fromName="from" toName="to" />
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            تنزيل ملف التقرير
          </button>
        </form>
      </Card>
    </div>
  );
}
