import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Input, Button, ModalTrigger, PageHeader } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import {
  updateStoreBrandingAction,
  updateStoreLogoAction,
  updateStoreSocialLinksAction,
  updateStoreHomepageSectionsAction,
  updateStoreLandingModeAction,
} from "./actions";

type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  hero_kicker: string;
  hero_title: string;
  site_description: string;
  whatsapp_number: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  show_points_of_sale_section: boolean;
  show_landing_page: boolean;
};

export default async function StoreControlPanelPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("store_settings")
    .select<
      "store_name, logo_url, hero_kicker, hero_title, site_description, whatsapp_number, instagram_url, tiktok_url, show_points_of_sale_section, show_landing_page",
      StoreSettings
    >(
      "store_name, logo_url, hero_kicker, hero_title, site_description, whatsapp_number, instagram_url, tiktok_url, show_points_of_sale_section, show_landing_page",
    )
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        title="التحكم بالمتجر الإلكتروني"
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
          <h2 className="font-semibold">أقسام الصفحة الرئيسية</h2>
          <p className="mt-1 text-sm text-foreground/60">تحكّم بظهور أقسام اختيارية بالرئيسية</p>
          <div className="mt-4">
            <ActionForm action={updateStoreHomepageSectionsAction} className="space-y-3" submitLabel="حفظ">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="showPointsOfSaleSection"
                  defaultChecked={settings?.show_points_of_sale_section ?? true}
                  className="h-4 w-4 rounded border-border"
                />
                إظهار قسم &quot;قريب منك دائمًا&quot; (نقاط البيع)
              </label>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">وضع الصفحة الرئيسية</h2>
          <p className="mt-1 text-sm text-foreground/60">
            بدّل بين عرض المتجر والمنتجات كالمعتاد، أو صفحة هبوط بسيطة تجمع بيانات الزوار المهتمين فقط (رقم جوال
            وما يرغبون بفتحه)
          </p>
          <div className="mt-4 space-y-3">
            <ActionForm action={updateStoreLandingModeAction} className="space-y-3" submitLabel="حفظ">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="showLandingPage"
                  defaultChecked={settings?.show_landing_page ?? false}
                  className="h-4 w-4 rounded border-border"
                />
                تفعيل صفحة الهبوط (بدل عرض المنتجات)
              </label>
            </ActionForm>
            <Link href="/store/leads">
              <Button variant="outline">عرض بيانات الزوار المستلمة</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">تصميم المتجر</h2>
          <p className="mt-1 text-sm text-foreground/60">
            الثيم الافتراضي بالمتجر، مع إمكانية تفعيل تخصيص بكود CSS مخصص، وإضافة قسم بمحتوى HTML حر
          </p>
          <div className="mt-4">
            <Link href="/store/theme">
              <Button variant="outline">فتح إعدادات تصميم المتجر</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
