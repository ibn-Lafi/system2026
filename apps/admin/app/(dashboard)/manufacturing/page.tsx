import { Card, PageHeader } from "@system2026/ui";

// لا توجد ميزات تصنيع حقيقية بالنظام بعد (لا أوامر إنتاج، لا قوائم مواد
// خام BOM، لا استهلاك مخزون تلقائي عند التصنيع) — هذا القسم حاليًا مجرّد
// مكان محجوز بانتظار تحديد المتطلبات الفعلية.
export default function ManufacturingHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="التصنيع"
      />
      <Card>
        <p className="text-sm text-foreground/60">
          هذا القسم مكان محجوز فقط حاليًا — لا يوجد بعد أوامر إنتاج أو قوائم مواد خام أو تتبّع تصنيع بقاعدة البيانات.
          أخبر فريق التطوير بمتطلبات هذا القسم الفعلية عند الحاجة له.
        </p>
      </Card>
    </div>
  );
}
