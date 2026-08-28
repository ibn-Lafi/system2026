import { Badge, Card, Input, MetricCard, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { adjustStockQuantityAction } from "./actions";

type StockRow = { id: string; product_id: string; quantity_available: number };
type MovementRow = {
  id: string;
  movement_type: string;
  product_id: string;
  location_type: string;
  quantity_change: number;
  balance_after: number;
  created_at: string;
};

const MOVEMENT_LABELS: Record<string, string> = {
  purchase_in: "شراء",
  transfer_out: "نقل خارج",
  transfer_in: "نقل داخل",
  sale_out: "بيع",
  return_in: "إرجاع",
  write_off: "خسارة",
  adjustment: "تعديل يدوي",
};

export default async function WarehousePage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_warehouse");

  const [{ data: stock }, { data: products }, { data: movements }] = await Promise.all([
    supabase
      .from("warehouse_stock")
      .select<"id, product_id, quantity_available", StockRow>("id, product_id, quantity_available")
      .order("quantity_available", { ascending: false }),
    supabase
      .from("products")
      .select<"id, name", { id: string; name: string }>("id, name")
      .order("name"),
    supabase
      .from("stock_movements")
      .select<
        "id, movement_type, product_id, location_type, quantity_change, balance_after, created_at",
        MovementRow
      >("id, movement_type, product_id, location_type, quantity_change, balance_after, created_at")
      .eq("location_type", "warehouse")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const totalUnits = (stock ?? []).reduce((sum, s) => sum + s.quantity_available, 0);
  const lowStockCount = (stock ?? []).filter((s) => s.quantity_available > 0 && s.quantity_available < 10).length;
  const outOfStockCount = (stock ?? []).filter((s) => s.quantity_available === 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المخزون"]} />}
        title="المخزون"
        subtitle="مخزون واحد مشترك للنظام كامل"
        actions={
          canManage ? (
            <ModalTrigger label="+ تعديل كمية منتج" title="تعديل كمية منتج بالمخزون">
              <ActionForm action={adjustStockQuantityAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">المنتج</label>
                  <Select name="productId" required>
                    <option value="">اختر منتجًا</option>
                    {(products ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm">الكمية الجديدة</label>
                  <Input name="quantity" type="number" step="1" min="0" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">سبب التعديل</label>
                  <Input name="reason" placeholder="مثال: جرد دوري / تلف" required />
                </div>
              </ActionForm>
            </ModalTrigger>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="عدد المنتجات بالمخزون" value={(stock?.length ?? 0).toString()} />
        <MetricCard label="إجمالي الكمية المتاحة" value={totalUnits.toString()} />
        <MetricCard label="منتجات منخفضة الكمية" value={lowStockCount.toString()} />
        <MetricCard label="منتجات نافذة الكمية" value={outOfStockCount.toString()} />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">الأرصدة الحالية</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">المنتج</th>
                <th>الكمية المتاحة</th>
              </tr>
            </thead>
            <tbody>
              {(stock ?? []).map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-2">{productNameById.get(s.product_id) ?? "—"}</td>
                  <td>
                    {s.quantity_available === 0 ? (
                      <Badge variant="danger">نفدت الكمية</Badge>
                    ) : s.quantity_available < 10 ? (
                      <Badge variant="warning">{s.quantity_available} — كمية منخفضة</Badge>
                    ) : (
                      s.quantity_available
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(stock?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد أرصدة بعد</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">آخر حركات المخزون (المخزن المركزي)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>المنتج</th>
                <th>النوع</th>
                <th>التغيير</th>
                <th>الرصيد بعدها</th>
              </tr>
            </thead>
            <tbody>
              {(movements ?? []).map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(m.created_at).toLocaleString("ar-SA")}</td>
                  <td>{productNameById.get(m.product_id) ?? "—"}</td>
                  <td>{MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}</td>
                  <td className={m.quantity_change < 0 ? "text-destructive" : "text-primary"}>
                    {m.quantity_change > 0 ? "+" : ""}
                    {m.quantity_change}
                  </td>
                  <td>{m.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(movements?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد حركات بعد</p> : null}
      </Card>
    </div>
  );
}
