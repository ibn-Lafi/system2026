import { redirect } from "next/navigation";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { createShiftAction, updateShiftAction } from "./actions";

type ShiftRow = { id: string; name: string; start_time: string; end_time: string };

export default async function HrShiftsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: shifts } = await supabase
    .from("shifts")
    .select<"id, name, start_time, end_time", ShiftRow>("id, name, start_time, end_time")
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "الورديات والبصمة"]} />}
        title="الورديات والبصمة"
        subtitle="إدارة الورديات — تسجيل الحضور يدوي بدل تكامل فعلي مع جهاز بصمة (لا يمكن الوصول لعتاد خارجي من تطبيق ويب)"
        actions={
          <ModalTrigger label="+ إضافة وردية" title="إضافة وردية">
            <ActionForm action={createShiftAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">اسم الوردية</label>
                <Input name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm">وقت البداية</label>
                  <Input name="startTime" type="time" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">وقت النهاية</label>
                  <Input name="endTime" type="time" required />
                </div>
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
                <th className="py-2">اسم الوردية</th>
                <th>البداية</th>
                <th>النهاية</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(shifts ?? []).map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-2">{s.name}</td>
                  <td dir="ltr">{s.start_time}</td>
                  <td dir="ltr">{s.end_time}</td>
                  <td>
                    <ModalTrigger label="تعديل" title={`تعديل وردية ${s.name}`} variant="outline" buttonSize="sm">
                      <ActionForm action={updateShiftAction} className="space-y-3">
                        <input type="hidden" name="id" value={s.id} />
                        <div>
                          <label className="mb-1 block text-sm">اسم الوردية</label>
                          <Input name="name" defaultValue={s.name} required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-sm">وقت البداية</label>
                            <Input name="startTime" type="time" defaultValue={s.start_time} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">وقت النهاية</label>
                            <Input name="endTime" type="time" defaultValue={s.end_time} required />
                          </div>
                        </div>
                      </ActionForm>
                    </ModalTrigger>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(shifts?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد ورديات بعد</p> : null}
      </Card>
    </div>
  );
}
