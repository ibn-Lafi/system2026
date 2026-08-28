import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Button, HorizontalBarChart, MetricCard, LineChart, PageHeader, Breadcrumb } from "@system2026/ui";
import { computeDelta } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";

const TREND_DAYS = 14;
const WEEKDAY_LABELS = ["أحد", "إثن", "ثلا", "أرب", "خمس", "جمعة", "سبت"];

type LeadRow = { id: string; phone_number: string; desired_store: string; created_at: string };
type WishStat = { key: string; display: string; count: number };

// تطبيع نص الأمنية لتجميع الإجابات المتشابهة (فراغات/علامات ترقيم زائدة،
// اختلاف صيغ الألف والتاء المربوطة) تحت نفس المجموعة عند حساب التكرار.
function normalizeWish(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!؟?]+$/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

// +9665XXXXXXXX → 05XXXXXXXX للعرض بالصيغة المحلية المألوفة.
function formatPhone(phone: string): string {
  return phone.replace(/^\+966/, "0");
}

export default async function StoreLeadsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("store_leads")
    .select("id, phone_number, desired_store, created_at")
    .order("created_at", { ascending: false });
  const leads = (data ?? []) as LeadRow[];

  const statsByKey = new Map<string, WishStat>();
  for (const lead of leads) {
    const display = lead.desired_store.trim();
    if (!display) continue;
    const key = normalizeWish(display);
    const existing = statsByKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      statsByKey.set(key, { key, display, count: 1 });
    }
  }
  const wishStats = Array.from(statsByKey.values()).sort(
    (a, b) => b.count - a.count || a.display.localeCompare(b.display, "ar"),
  );
  const topWishes = wishStats.slice(0, 10);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const trendStart = new Date(todayStart);
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));
  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 6);
  const previous7Start = new Date(last7Start);
  previous7Start.setDate(previous7Start.getDate() - 7);

  const leadsByDay = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.created_at.slice(0, 10);
    leadsByDay.set(key, (leadsByDay.get(key) ?? 0) + 1);
  }
  const trendDays = Array.from({ length: TREND_DAYS }, (_, i) => {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const trendLabels = trendDays.map((d) => WEEKDAY_LABELS[d.getDay()]!);
  const trendValues = trendDays.map((d) => leadsByDay.get(d.toISOString().slice(0, 10)) ?? 0);

  const last7Count = leads.filter((l) => new Date(l.created_at) >= last7Start).length;
  const previous7Count = leads.filter((l) => {
    const d = new Date(l.created_at);
    return d >= previous7Start && d < last7Start;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المتجر الإلكتروني", "بيانات الزوار"]} />}
        title="بيانات الزوار المستلمة"
        subtitle="الطلبات المرسلة من صفحة الهبوط بالمتجر العام"
        actions={
          <Link href="/store">
            <Button variant="outline">رجوع لإعدادات المتجر</Button>
          </Link>
        }
      />

      {leads.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/60">لا توجد طلبات مستلمة بعد.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="إجمالي الطلبات المستلمة"
              value={leads.length.toString()}
              delta={computeDelta(last7Count, previous7Count)}
              sparkline={trendValues.slice(-7)}
            />
            <MetricCard label="عدد الأمنيات الفريدة" value={wishStats.length.toString()} />
          </div>

          <Card>
            <h2 className="mb-1 text-sm font-semibold">الطلبات اليومية آخر {TREND_DAYS} يومًا</h2>
            <LineChart series={[{ label: "الطلبات", color: "hsl(var(--primary))", values: trendValues }]} xLabels={trendLabels} />
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">أكثر الأمنيات تكرارًا</h2>
            <HorizontalBarChart
              items={topWishes.map((w) => ({
                label: w.display,
                value: w.count,
                displayValue: `${w.count} ${w.count === 1 ? "طلب" : "طلبات"}`,
              }))}
            />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">تقرير إحصائي: تكرار كل أمنية ({wishStats.length} أمنية فريدة)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-foreground/60">
                    <th className="py-2">الأمنية</th>
                    <th>عدد التكرار</th>
                    <th>النسبة من الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {wishStats.map((w) => (
                    <tr key={w.key} className="border-b border-border/50">
                      <td className="py-2">{w.display}</td>
                      <td>{w.count}</td>
                      <td>{((w.count / leads.length) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">كل الطلبات المستلمة ({leads.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-foreground/60">
                    <th className="py-2">رقم الجوال</th>
                    <th>وش يتمنى الزائر؟</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/50">
                      <td className="py-2 whitespace-nowrap" dir="ltr">
                        {formatPhone(lead.phone_number)}
                      </td>
                      <td>{lead.desired_store}</td>
                      <td className="whitespace-nowrap text-foreground/60">
                        {new Date(lead.created_at).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
