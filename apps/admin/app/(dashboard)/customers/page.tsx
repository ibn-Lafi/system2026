import Link from "next/link";
import { Button, Card, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";

type Customer = { id: string; name: string; phone: string | null; created_at: string };

export default async function CustomersPage() {
  const supabase = createSupabaseServerClient();

  const { data: customers } = await supabase
    .from("customers")
    .select<"id, name, phone, created_at", Customer>("id, name, phone, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "العملاء"]} />}
        title="العملاء"
        subtitle="عملاء المتجر الإلكتروني — تُدار بياناتهم لاحقًا عبر حسابات المتجر نفسها"
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>رقم الجوال</th>
                <th>تاريخ إنشاء الحساب</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2">{c.name}</td>
                  <td dir="ltr">{c.phone ?? "—"}</td>
                  <td>{new Date(c.created_at).toLocaleDateString("ar-SA")}</td>
                  <td className="py-2">
                    <Link href={`/customers/${c.id}`}>
                      <Button type="button" variant="outline" size="sm">
                        تقرير العميل
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(customers?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد عملاء بعد</p> : null}
      </Card>
    </div>
  );
}
