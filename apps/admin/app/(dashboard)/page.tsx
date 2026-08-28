import { Card, PageHeader, Breadcrumb } from "@system2026/ui";

const WEEKDAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_LABELS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// لا إحصائيات هنا عمدًا — كل مؤشرات وتقارير النظام مركزة حصرًا بصفحتي
// "التقارير" و"بيانات الزوار المستلمة" فقط.
export default function DashboardHomePage() {
  const now = new Date();
  const dateLabel = `${WEEKDAY_LABELS[now.getDay()]}، ${now.getDate()} ${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الرئيسية"]} />}
        title="الرئيسية"
        subtitle="مرحبًا بك في لوحة تحكم سبعة"
      />
      <Card>
        <p className="text-sm text-foreground/60">{dateLabel}</p>
        <p className="mt-2">
          استخدم القائمة الجانبية للوصول لكل أقسام النظام — المنتجات، الموردين، المخزون، العملاء، الفواتير،
          والتقارير.
        </p>
      </Card>
    </div>
  );
}
