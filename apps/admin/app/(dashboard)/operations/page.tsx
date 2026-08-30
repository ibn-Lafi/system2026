import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Card, PageHeader } from "@system2026/ui";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";

const OPERATIONS_SECTIONS: { href: string; title: string; description: string }[] = [
  { href: "/products", title: "المنتجات", description: "كتالوج المنتجات، الفئات، الأسعار، وصور المتجر" },
  { href: "/warehouse", title: "المخزون", description: "أرصدة المخزون المشترك، وتعديل الكميات يدويًا عند الحاجة" },
  { href: "/suppliers", title: "الموردين والمشتريات", description: "بيانات الموردين، فواتير الشراء، والمستحقات" },
];

export default async function OperationsHubPage() {
  const role = await getCurrentUserRole();
  if (
    !hasPermission(role, "manage_products") &&
    !hasPermission(role, "manage_warehouse") &&
    !hasPermission(role, "manage_purchases")
  )
    redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="التشغيل"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {OPERATIONS_SECTIONS.map((section) => (
          <Card key={section.href}>
            <h2 className="font-semibold">{section.title}</h2>
            <p className="mt-1 text-sm text-foreground/60">{section.description}</p>
            <div className="mt-4">
              <Link href={section.href}>
                <Button variant="outline">فتح</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
