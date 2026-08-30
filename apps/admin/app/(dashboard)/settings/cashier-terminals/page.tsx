import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import {
  createCashierTerminalAction,
  resetCashierTerminalPinAction,
  setCashierTerminalActiveAction,
} from "./actions";

type TerminalRow = { id: string; name: string; is_active: boolean; created_at: string };

export default async function CashierTerminalsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: terminals } = await supabase
    .from("cashier_terminals")
    .select<"id, name, is_active, created_at", TerminalRow>("id, name, is_active, created_at")
    .order("created_at");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الإعدادات", "حاويات الكاشير"]} />}
        title="حاويات الكاشير"
        subtitle="أجهزة نقطة البيع المستخدمة بتطبيق الكاشير المستقل — كل حاوية لها رمز PIN خاص بها"
        actions={
          <ModalTrigger label="+ إضافة حاوية" title="إضافة حاوية كاشير">
            <ActionForm action={createCashierTerminalAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">اسم الحاوية</label>
                <Input name="name" placeholder="مثال: كاشير الفرع الرئيسي" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">رمز PIN (4 إلى 6 أرقام)</label>
                <Input name="pin" dir="ltr" inputMode="numeric" pattern="[0-9]{4,6}" required />
              </div>
            </ActionForm>
          </ModalTrigger>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(terminals ?? []).map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="py-2">{t.name}</td>
                  <td>
                    {t.is_active ? <Badge variant="success">نشطة</Badge> : <Badge variant="muted">معطّلة</Badge>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <ModalTrigger label="تغيير PIN" title={`تغيير PIN — ${t.name}`} variant="outline" buttonSize="sm">
                        <ActionForm action={resetCashierTerminalPinAction} className="space-y-3">
                          <input type="hidden" name="terminalId" value={t.id} />
                          <div>
                            <label className="mb-1 block text-sm">رمز PIN الجديد</label>
                            <Input name="pin" dir="ltr" inputMode="numeric" pattern="[0-9]{4,6}" required />
                          </div>
                        </ActionForm>
                      </ModalTrigger>
                      <form action={setCashierTerminalActiveAction}>
                        <input type="hidden" name="terminalId" value={t.id} />
                        <input type="hidden" name="isActive" value={(!t.is_active).toString()} />
                        <Button type="submit" size="sm" variant={t.is_active ? "destructive" : "outline"}>
                          {t.is_active ? "تعطيل" : "تفعيل"}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(terminals?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد حاويات كاشير بعد</p> : null}
      </Card>
    </div>
  );
}
