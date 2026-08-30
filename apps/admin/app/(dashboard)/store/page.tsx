import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Button, PageHeader } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { updateStoreHomepageSectionsAction } from "./actions";

type StoreSettings = {
  show_points_of_sale_section: boolean;
};

export default async function StoreControlPanelPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("store_settings")
    .select<"show_points_of_sale_section", StoreSettings>("show_points_of_sale_section")
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader title="المتجر" />

      <div className="grid gap-4 sm:grid-cols-2">
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
          <h2 className="font-semibold">التصميم</h2>
          <p className="mt-1 text-sm text-foreground/60">
            الهوية والنصوص، الشعار، روابط التواصل الاجتماعي، والثيم — كل ما يخص شكل المتجر بصفحة واحدة
          </p>
          <div className="mt-4">
            <Link href="/store/theme">
              <Button variant="outline">فتح التصميم</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
