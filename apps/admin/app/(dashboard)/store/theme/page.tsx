import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Button, ModalTrigger, PageHeader } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { ThemeForm } from "./theme-form";
import { SectionsPanel } from "./sections-panel";

type ThemeSettings = { custom_css: string | null; custom_html: string | null };

export default async function StoreThemePage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("store_settings")
    .select<"custom_css, custom_html", ThemeSettings>("custom_css, custom_html")
    .eq("id", 1)
    .single();

  const isCustomized = Boolean(settings?.custom_css || settings?.custom_html);

  return (
    <div className="space-y-6">
      <PageHeader
        title="تصميم المتجر"
        actions={
          <Link href="/store">
            <Button variant="outline">رجوع لإعدادات المتجر</Button>
          </Link>
        }
      />

      <Card>
        <h2 className="font-semibold">الثيم الافتراضي</h2>
        <p className="mt-1 text-sm text-foreground/60">
          {isCustomized
            ? "التخصيص بالكود مفعّل حاليًا، لذا الثيم الافتراضي معطّل بالمتجر."
            : "هذا هو ثيم المتجر المعمول به حاليًا."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-border shadow-sm">
            <div className="flex-1 bg-foreground" />
            <div className="flex-1 bg-background" />
          </div>
          <div className="text-sm text-foreground/70">
            <p className="font-medium text-foreground">أبيض وأسود</p>
            <p>خلفية بيضاء، عناصر داكنة، بدون ألوان إضافية</p>
          </div>
        </div>
        <div className="mt-4">
          <ModalTrigger label="تخصيص بالكود" title="تخصيص التصميم بالكود" variant="outline" size="lg">
            <p className="mb-3 text-sm text-foreground/60">
              هذا الكود يُنفَّذ مباشرة على المتجر الفعلي لكل الزوار — تأكد من صحته قبل الحفظ. لا تلصق كودًا من مصدر
              لا تثق به.
            </p>
            <ThemeForm customCss={settings?.custom_css ?? null} customHtml={settings?.custom_html ?? null} />
          </ModalTrigger>
        </div>
      </Card>

      <SectionsPanel />
    </div>
  );
}
