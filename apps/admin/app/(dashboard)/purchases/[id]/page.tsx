import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, ModalTrigger, PageHeader } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { getAttachmentSignedUrl } from "../../../../lib/get-attachment-url";
import { RecordInvoicePaymentForm } from "../record-payment-form";

const ATTACHMENTS_BUCKET = "purchase-invoice-attachments";

type PurchaseInvoiceDetail = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  subtotal: number;
  total_amount: number;
  payment_status: string;
  attachment_path: string | null;
  supplier_id: string;
};

type ItemRow = {
  id: string;
  product_id: string;
  unit_id: string;
  quantity_in_unit: number;
  unit_cost: number;
  subtotal: number;
};

type PaymentRow = { id: string; payment_date: string; amount: number; method: string };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  check: "شيك",
  transfer: "تحويل بنكي",
};

export default async function PurchaseInvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_purchases");

  const { data: invoice } = await supabase
    .from("purchase_invoices")
    .select<
      "id, invoice_number, invoice_date, subtotal, total_amount, payment_status, attachment_path, supplier_id",
      PurchaseInvoiceDetail
    >("id, invoice_number, invoice_date, subtotal, total_amount, payment_status, attachment_path, supplier_id")
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const [{ data: supplier }, { data: items }, { data: products }, { data: units }, { data: payments }] =
    await Promise.all([
      supabase.from("suppliers").select<"id, name", { id: string; name: string }>("id, name").eq("id", invoice.supplier_id).single(),
      supabase
        .from("purchase_invoice_items")
        .select<
          "id, product_id, unit_id, quantity_in_unit, unit_cost, subtotal",
          ItemRow
        >("id, product_id, unit_id, quantity_in_unit, unit_cost, subtotal")
        .eq("purchase_invoice_id", invoice.id),
      supabase.from("products").select<"id, name", { id: string; name: string }>("id, name"),
      supabase.from("units").select<"id, name", { id: string; name: string }>("id, name"),
      supabase
        .from("supplier_payments")
        .select<"id, payment_date, amount, method", PaymentRow>("id, payment_date, amount, method")
        .eq("purchase_invoice_id", invoice.id)
        .order("payment_date", { ascending: false }),
    ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  const paidTotal = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice.total_amount - paidTotal;
  const isSettled = invoice.payment_status !== "unpaid" && invoice.payment_status !== "partial";

  const attachmentUrl = await getAttachmentSignedUrl(supabase, ATTACHMENTS_BUCKET, invoice.attachment_path);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`فاتورة شراء #${invoice.invoice_number}`}
        actions={
          canManage && !isSettled ? (
            <ModalTrigger label="تسجيل دفعة" title="تسجيل دفعة" variant="outline">
              <RecordInvoicePaymentForm supplierId={invoice.supplier_id} purchaseInvoiceId={invoice.id} remaining={remaining} />
            </ModalTrigger>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-foreground/60">التاريخ</p>
          <p className="mt-1 font-semibold">{new Date(invoice.invoice_date).toLocaleString("ar-SA")}</p>
        </Card>
        <Card>
          <p className="text-sm text-foreground/60">المورد</p>
          {supplier ? (
            <Link href={`/suppliers/${supplier.id}`} className="mt-1 block font-semibold text-primary underline">
              {supplier.name}
            </Link>
          ) : (
            <p className="mt-1 font-semibold">—</p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-foreground/60">حالة الدفع</p>
          <p className="mt-1 font-semibold">{PAYMENT_STATUS_LABELS[invoice.payment_status] ?? invoice.payment_status}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">بنود الفاتورة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">المنتج</th>
                <th>الوحدة</th>
                <th>الكمية</th>
                <th>تكلفة الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2">{productNameById.get(item.product_id) ?? "—"}</td>
                  <td>{unitNameById.get(item.unit_id) ?? "—"}</td>
                  <td>{item.quantity_in_unit}</td>
                  <td>{formatCurrency(item.unit_cost)}</td>
                  <td>{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p>
            <span className="text-foreground/60">الإجمالي: </span>
            <span className="font-semibold">{formatCurrency(invoice.total_amount)}</span>
          </p>
          <p>
            <span className="text-foreground/60">المدفوع: </span>
            <span className="font-semibold">{formatCurrency(paidTotal)}</span>
          </p>
          {!isSettled ? (
            <p>
              <span className="text-foreground/60">المتبقي: </span>
              <span className="font-semibold">{formatCurrency(remaining)}</span>
            </p>
          ) : null}
        </div>
        {attachmentUrl ? (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-primary underline">
            عرض مرفق الفاتورة
          </a>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">الدفعات المسددة على هذه الفاتورة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString("ar-SA")}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(payments?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد دفعات بعد</p> : null}
      </Card>
    </div>
  );
}
