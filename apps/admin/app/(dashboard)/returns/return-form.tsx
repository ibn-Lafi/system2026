"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Select, useModalClose } from "@system2026/ui";
import {
  createReturnAction,
  getCustomerInvoicesAction,
  getInvoiceReturnableItemsAction,
  type CustomerInvoice,
  type ReturnableItem,
  type ReturnActionState,
} from "./actions";

type Customer = { id: string; name: string; shop_name: string | null };
type Condition = "resalable" | "damaged" | "expired";

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "resalable", label: "سليم (يرجع للمخزون)" },
  { value: "damaged", label: "تالف" },
  { value: "expired", label: "منتهي الصلاحية" },
];

const initialState: ReturnActionState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "جارٍ التسجيل..." : "تسجيل المرتجع"}
    </Button>
  );
}

// تدفّق موجّه: عميل ← فاتورة سابقة له ← تحديد كمية/حالة الإرجاع من بنود
// تلك الفاتورة فعليًا (بدل اختيار منتج حر بكمية حرة) — يمنع اختيار منتج
// غير موجود بالفاتورة أو كمية أكبر من المباعة فعليًا.
export function ReturnForm({ customers }: { customers: Customer[] }) {
  const [state, formAction] = useFormState(createReturnAction, initialState);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [invoices, setInvoices] = useState<CustomerInvoice[] | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [items, setItems] = useState<ReturnableItem[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [conditions, setConditions] = useState<Record<string, Condition>>({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const closeModal = useModalClose();

  useEffect(() => {
    if (!state.returnId || !closeModal) return;
    const timer = setTimeout(closeModal, 700);
    return () => clearTimeout(timer);
  }, [state.returnId, closeModal]);

  useEffect(() => {
    if (!customerId) return;
    setInvoices(null);
    setInvoiceId("");
    setItems(null);
    setLoadingInvoices(true);
    getCustomerInvoicesAction(customerId)
      .then(setInvoices)
      .finally(() => setLoadingInvoices(false));
  }, [customerId]);

  useEffect(() => {
    if (!invoiceId) return;
    setItems(null);
    setQuantities({});
    setConditions({});
    setLoadingItems(true);
    getInvoiceReturnableItemsAction(invoiceId)
      .then((rows) => {
        setItems(rows);
        setConditions(Object.fromEntries(rows.map((r) => [r.productId, "resalable" as Condition])));
      })
      .finally(() => setLoadingItems(false));
  }, [invoiceId]);

  const selectedLines = (items ?? [])
    .map((item) => ({ item, quantity: quantities[item.productId] ?? 0 }))
    .filter((line) => line.quantity > 0);

  const returnItemsPayload = selectedLines.map((line) => ({
    productId: line.item.productId,
    quantity: line.quantity,
    unitPrice: line.item.unitPrice,
    condition: conditions[line.item.productId] ?? "resalable",
  }));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="items" value={JSON.stringify(returnItemsPayload)} />

      <div>
        <label className="mb-1 block text-sm font-medium">العميل</label>
        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الفاتورة</label>
        {loadingInvoices ? (
          <p className="text-sm text-foreground/60">جارٍ التحميل...</p>
        ) : (invoices?.length ?? 0) === 0 ? (
          <p className="text-sm text-foreground/60">لا توجد فواتير سابقة لهذا العميل</p>
        ) : (
          <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
            <option value="">اختر فاتورة</option>
            {invoices?.map((inv) => (
              <option key={inv.id} value={inv.id}>
                فاتورة #{inv.invoiceNumber} — {new Date(inv.invoiceDate).toLocaleDateString("ar-SA")}
              </option>
            ))}
          </Select>
        )}
      </div>

      {invoiceId ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">حدد المنتج والكمية والحالة من بنود الفاتورة</p>
          {loadingItems ? (
            <p className="text-sm text-foreground/60">جارٍ التحميل...</p>
          ) : (items?.length ?? 0) === 0 ? (
            <p className="text-sm text-foreground/60">لا توجد بنود قابلة للإرجاع بهذه الفاتورة</p>
          ) : (
            items?.map((item) => (
              <Card key={item.productId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{item.productName}</p>
                  <span className="text-xs text-foreground/60">
                    الحد الأقصى: {item.maxQuantity} {item.unitName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">الكمية المرتجعة</label>
                    <Input
                      type="number"
                      min={0}
                      max={item.maxQuantity}
                      value={quantities[item.productId] ?? 0}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const clamped = Math.max(0, Math.min(item.maxQuantity, Number.isFinite(raw) ? raw : 0));
                        setQuantities((prev) => ({ ...prev, [item.productId]: clamped }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">الحالة</label>
                    <Select
                      value={conditions[item.productId] ?? "resalable"}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, [item.productId]: e.target.value as Condition }))
                      }
                      disabled={(quantities[item.productId] ?? 0) === 0}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.returnId ? <p className="text-sm text-primary">تم تسجيل المرتجع بنجاح ✓</p> : null}

      <SubmitButton disabled={!invoiceId || returnItemsPayload.length === 0} />
    </form>
  );
}
