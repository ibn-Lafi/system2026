import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { createAdvanceAction, updateAdvanceStatusAction, createCustodyItemAction, returnCustodyItemAction } from "./actions";

type AdvanceRow = {
  id: string;
  employee_id: string;
  amount: number;
  monthly_deduction_amount: number;
  remaining_balance: number;
  status: "pending" | "approved" | "repaid";
};
type CustodyRow = {
  id: string;
  employee_id: string;
  item_name: string;
  description: string | null;
  assigned_date: string;
  returned_date: string | null;
  status: "assigned" | "returned";
};
type EmployeeOption = { id: string; full_name: string };

const ADVANCE_STATUS_LABELS: Record<AdvanceRow["status"], string> = {
  pending: "قيد المراجعة",
  approved: "معتمدة",
  repaid: "مسدَّدة",
};

export default async function HrAdvancesPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_hr")) redirect("/");

  const supabase = createSupabaseServerClient();
  const [{ data: advances }, { data: custodyItems }, { data: employees }] = await Promise.all([
    supabase
      .from("employee_advances")
      .select<
        "id, employee_id, amount, monthly_deduction_amount, remaining_balance, status",
        AdvanceRow
      >("id, employee_id, amount, monthly_deduction_amount, remaining_balance, status")
      .order("request_date", { ascending: false }),
    supabase
      .from("employee_custody_items")
      .select<
        "id, employee_id, item_name, description, assigned_date, returned_date, status",
        CustodyRow
      >("id, employee_id, item_name, description, assigned_date, returned_date, status")
      .order("assigned_date", { ascending: false }),
    supabase
      .from("employees")
      .select<"id, full_name", EmployeeOption>("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const employeeNameById = new Map((employees ?? []).map((e) => [e.id, e.full_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموارد البشرية", "السلف والعهد"]} />}
        title="السلف والعهد"
        subtitle="سلف الموظفين والعهد المسندة إليهم"
      />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">السلف</h2>
          <ModalTrigger label="+ تسجيل سلفة" title="تسجيل سلفة">
            <ActionForm action={createAdvanceAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">الموظف</label>
                <Select name="employeeId" required>
                  <option value="">اختر موظفًا</option>
                  {(employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">المبلغ</label>
                <Input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">قسط الخصم الشهري</label>
                <Input name="monthlyDeductionAmount" type="number" step="0.01" min="0" />
              </div>
              <div>
                <label className="mb-1 block text-sm">السبب</label>
                <Input name="reason" />
              </div>
            </ActionForm>
          </ModalTrigger>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الموظف</th>
                <th>المبلغ</th>
                <th>قسط الخصم</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(advances ?? []).map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-2">{employeeNameById.get(a.employee_id) ?? "—"}</td>
                  <td>{a.amount.toLocaleString("ar-SA")}</td>
                  <td>{a.monthly_deduction_amount.toLocaleString("ar-SA")}</td>
                  <td>{a.remaining_balance.toLocaleString("ar-SA")}</td>
                  <td>
                    <Badge variant={a.status === "repaid" ? "success" : a.status === "approved" ? "default" : "warning"}>
                      {ADVANCE_STATUS_LABELS[a.status]}
                    </Badge>
                  </td>
                  <td>
                    {a.status !== "repaid" ? (
                      <div className="flex gap-2">
                        {a.status === "pending" ? (
                          <form action={updateAdvanceStatusAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="approved" />
                            <Button type="submit" size="sm">
                              اعتماد
                            </Button>
                          </form>
                        ) : null}
                        <form action={updateAdvanceStatusAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="repaid" />
                          <Button type="submit" size="sm" variant="outline">
                            تعليم كمسدَّدة
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(advances?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد سلف بعد</p> : null}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">العهد</h2>
          <ModalTrigger label="+ إسناد عهدة" title="إسناد عهدة لموظف">
            <ActionForm action={createCustodyItemAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">الموظف</label>
                <Select name="employeeId" required>
                  <option value="">اختر موظفًا</option>
                  {(employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">اسم العهدة</label>
                <Input name="itemName" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">وصف</label>
                <Input name="description" />
              </div>
            </ActionForm>
          </ModalTrigger>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الموظف</th>
                <th>العهدة</th>
                <th>تاريخ الإسناد</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(custodyItems ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2">{employeeNameById.get(c.employee_id) ?? "—"}</td>
                  <td>{c.item_name}</td>
                  <td>{c.assigned_date}</td>
                  <td>
                    <Badge variant={c.status === "returned" ? "muted" : "success"}>
                      {c.status === "returned" ? "مُرجَعة" : "مسندة"}
                    </Badge>
                  </td>
                  <td>
                    {c.status === "assigned" ? (
                      <form action={returnCustodyItemAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button type="submit" size="sm" variant="outline">
                          تسجيل إرجاع
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(custodyItems?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد عهد بعد</p> : null}
      </Card>
    </div>
  );
}
