import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import {
  updateCompanyInfoAction,
  updateInvoiceGracePeriodAction,
  updateExpiryAlertThresholdAction,
  updateLoyaltyRatioAction,
} from "./actions";

type Settings = {
  company_name: string;
  vat_registration_number: string;
  commercial_registration_number: string;
  company_address: string;
  invoice_edit_grace_period_minutes: number;
  expiry_alert_days_threshold: number;
  loyalty_riyals_per_point: number;
};

export default async function SettingsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("system_settings")
    .select<
      "company_name, vat_registration_number, commercial_registration_number, company_address, invoice_edit_grace_period_minutes, expiry_alert_days_threshold, loyalty_riyals_per_point",
      Settings
    >(
      "company_name, vat_registration_number, commercial_registration_number, company_address, invoice_edit_grace_period_minutes, expiry_alert_days_threshold, loyalty_riyals_per_point",
    )
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الإعدادات"]} />}
        title="الإعدادات"
        subtitle="بيانات الشركة، المستخدمون، وإعدادات النظام"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">بيانات الشركة والفوترة</h2>
          <p className="mt-1 text-sm text-foreground/60">
            اسم الشركة، الرقم الضريبي، السجل التجاري، والعنوان — تظهر بترويسة كل فاتورة وتُستخدم بتوليد QR
            (راجع requirements.md §8.1)
          </p>
          <div className="mt-4">
            <ModalTrigger label="تعديل" title="بيانات الشركة والفوترة" variant="outline">
              <ActionForm action={updateCompanyInfoAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">اسم الشركة</label>
                  <Input name="companyName" defaultValue={settings?.company_name ?? ""} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الرقم الضريبي (VAT Registration Number)</label>
                  <Input
                    name="vatRegistrationNumber"
                    dir="ltr"
                    defaultValue={settings?.vat_registration_number ?? ""}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">رقم السجل التجاري</label>
                  <Input
                    name="commercialRegistrationNumber"
                    dir="ltr"
                    defaultValue={settings?.commercial_registration_number ?? ""}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">عنوان الشركة</label>
                  <Input name="companyAddress" defaultValue={settings?.company_address ?? ""} />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">المستخدمون</h2>
          <p className="mt-1 text-sm text-foreground/60">
            إضافة موظفي لوحة التحكم، تحديد أدوارهم وصلاحياتهم، وتفعيل/إيقاف حساباتهم
          </p>
          <div className="mt-4">
            <Link href="/settings/users">
              <Button variant="outline">فتح صفحة المستخدمين</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">فترة سماح تعديل/إلغاء الفاتورة</h2>
          <p className="mt-1 text-sm text-foreground/60">
            راجع requirements.md §7.7 — الفترة الحالية:{" "}
            <span className="font-semibold text-foreground">
              {settings?.invoice_edit_grace_period_minutes ?? 30} دقيقة
            </span>
          </p>
          <div className="mt-4">
            <ModalTrigger label="تعديل" title="فترة سماح تعديل/إلغاء الفاتورة" variant="outline">
              <ActionForm action={updateInvoiceGracePeriodAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">فترة السماح (دقيقة)</label>
                  <Input
                    name="invoiceEditGracePeriodMinutes"
                    type="number"
                    min={1}
                    defaultValue={settings?.invoice_edit_grace_period_minutes ?? 30}
                    required
                  />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">تنبيه قرب انتهاء الصلاحية</h2>
          <p className="mt-1 text-sm text-foreground/60">
            عدد الأيام قبل الانتهاء الذي يظهر عنده تنبيه بالتقارير — العتبة الحالية:{" "}
            <span className="font-semibold text-foreground">
              {settings?.expiry_alert_days_threshold ?? 30} يوم
            </span>
          </p>
          <div className="mt-4">
            <ModalTrigger label="تعديل" title="تنبيه قرب انتهاء الصلاحية" variant="outline">
              <ActionForm action={updateExpiryAlertThresholdAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">عدد الأيام</label>
                  <Input
                    name="expiryAlertDaysThreshold"
                    type="number"
                    min={1}
                    defaultValue={settings?.expiry_alert_days_threshold ?? 30}
                    required
                  />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">نقاط الولاء</h2>
          <p className="mt-1 text-sm text-foreground/60">
            تُحتسب تلقائيًا عند كل فاتورة كاشير أو طلب متجر إلكتروني — المعدّل الحالي:{" "}
            <span className="font-semibold text-foreground">
              نقطة واحدة لكل {settings?.loyalty_riyals_per_point ?? 10} ريال
            </span>
          </p>
          <div className="mt-4">
            <ModalTrigger label="تعديل" title="معدّل نقاط الولاء" variant="outline">
              <ActionForm action={updateLoyaltyRatioAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">ريال لكل نقطة واحدة</label>
                  <Input
                    name="loyaltyRiyalsPerPoint"
                    type="number"
                    step="0.5"
                    min={0.5}
                    defaultValue={settings?.loyalty_riyals_per_point ?? 10}
                    required
                  />
                </div>
              </ActionForm>
            </ModalTrigger>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">موظفو الكاشير</h2>
          <p className="mt-1 text-sm text-foreground/60">
            إدارة موظفي نقطة البيع (الاسم ورمز PIN الخاص بكل موظف) المستخدمين بتطبيق الكاشير المستقل
          </p>
          <div className="mt-4">
            <Link href="/settings/cashier-employees">
              <Button variant="outline">فتح صفحة موظفي الكاشير</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
