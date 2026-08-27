import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Button, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";

type LeadRow = { id: string; phone_number: string; desired_store: string; created_at: string };

export default async function StoreLeadsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("store_leads")
    .select("id, phone_number, desired_store, created_at")
    .order("created_at", { ascending: false });
  const leads = (data ?? []) as LeadRow[];

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
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold" dir="ltr">
                  {lead.phone_number}
                </p>
                <p className="mt-1 text-sm text-foreground/70">{lead.desired_store}</p>
              </div>
              <span className="shrink-0 text-xs text-foreground/50">
                {new Date(lead.created_at).toLocaleString("ar")}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
