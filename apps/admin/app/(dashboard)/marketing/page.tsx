import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Card, PageHeader } from "@system2026/ui";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";

const MARKETING_SECTIONS: { href: string; title: string; description: string }[] = [
  { href: "/marketing/abandoned-carts", title: "السلات المتروكة", description: "زوار حدّدوا هويتهم بالمتجر ولم يُكملوا الطلب" },
];

export default async function MarketingHubPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="التسويق"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {MARKETING_SECTIONS.map((section) => (
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
