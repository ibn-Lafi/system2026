import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Input, Button, ModalTrigger, PageHeader } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { ActionForm } from "../../../../components/action-form";
import { ThemeForm } from "./theme-form";
import { SectionsPanel } from "./sections-panel";
import { updateStoreBrandingAction, updateStoreLogoAction, updateStoreSocialLinksAction } from "../actions";

type ThemeSettings = {
  store_name: string;
  logo_url: string | null;
  hero_kicker: string;
  hero_title: string;
  site_description: string;
  whatsapp_number: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  custom_css: string | null;
  custom_html: string | null;
};

// "التصميم" = كل ما يخص الهوية البصرية والمظهر العام للمتجر بصفحة واحدة:
// الهوية والنصوص، الشعار، روابط التواصل الاجتماعي، والثيم/التخصيص بالكود —
// كانت موزّعة سابقًا بين هذي الصفحة وصفحة /store، جُمعت هنا لأنها كلها
// "شكل ومظهر" وليست "إعدادات تشغيل" (تلك بقيت بصفحة /store).
export default async function StoreThemePage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("store_settings")
    .select<
      "store_name, logo_url, hero_kicker, hero_title, site_description, whatsapp_number, instagram_url, tiktok_url, custom_css, custom_html",
      ThemeSettings
    >(
      "store_name, logo_url, hero_kicker, hero_title, site_description, whatsapp_number, instagram_url, tiktok_url, custom_css, custom_html",
    )
    .eq("id", 1)
    .single();

  const isCustomized = Boolean(settings?.custom_css || settings?.custom_html);

  return (
    <div className="space-y-6">
      <PageHeader
        title="التصميم"
        actions={
          <Link href="/store">
            <Button variant="outline">رجوع لإعدادات المتجر</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">الهوية والنصوص</h2>
          <p className="mt-1 text-sm text-foreground/60">
            اسم المتجر، النص العلوي والعنوان بالبطل الأسود بالرئيسية، ووصف الموقع (Meta Description)
          </p>
          <div className="mt-4">
            <ModalTrigger label="تعديل" title="الهوية والنصوص" variant="outline">
              <ActionForm action={updateStoreBrandingAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">اسم المتجر</label>
                  <Input name="storeName" defaultValue={settings?.store_name ?? ""} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">النص العلوي بالرئيسية (مثل: MELCHI)</label>
                  <Input name="heroKicker" dir="ltr" defaultValue={settings?.hero_kicker ?? ""} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">عنوان الرئيسية</label>
                  <Input name="heroTitle" defaultValue={settings?.hero_title ?? ""} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">وصف الموقع</label>
                  <Input name="siteDescription" defaultValue={settings?.site_description ?? ""} />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">الشعار</h2>
          <p className="mt-1 text-sm text-foreground/60">
            يظهر بفوتر المتجر — بدون شعار مرفوع يظهر الحرف الأول من اسم المتجر بدلًا منه
          </p>
          <div className="mt-4 flex items-center gap-4">
            {settings?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="شعار المتجر" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-lg font-black text-foreground">
                {(settings?.store_name ?? "م").charAt(0)}
              </span>
            )}
            <ModalTrigger label="تغيير الشعار" title="تغيير شعار المتجر" variant="outline">
              <ActionForm action={updateStoreLogoAction} className="space-y-3" submitLabel="رفع">
                <div>
                  <label className="mb-1 block text-sm">صورة الشعار</label>
                  <Input name="logo" type="file" accept="image/*" required />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">روابط التواصل الاجتماعي</h2>
          <p className="mt-1 text-sm text-foreground/60">تظهر كأيقونات بفوتر المتجر — أي حقل فارغ لا تظهر أيقونته</p>
          <div className="mt-4">
            <ModalTrigger label="تعديل" title="روابط التواصل الاجتماعي" variant="outline">
              <ActionForm action={updateStoreSocialLinksAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">رقم واتساب (مع رمز الدولة، بدون +)</label>
                  <Input
                    name="whatsappNumber"
                    dir="ltr"
                    placeholder="9665xxxxxxxx"
                    defaultValue={settings?.whatsapp_number ?? ""}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">رابط انستغرام</label>
                  <Input
                    name="instagramUrl"
                    dir="ltr"
                    placeholder="https://instagram.com/..."
                    defaultValue={settings?.instagram_url ?? ""}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">رابط تيك توك</label>
                  <Input
                    name="tiktokUrl"
                    dir="ltr"
                    placeholder="https://tiktok.com/@..."
                    defaultValue={settings?.tiktok_url ?? ""}
                  />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

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
      </div>

      <SectionsPanel />
    </div>
  );
}
