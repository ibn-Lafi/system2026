"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@system2026/utils";
import { useCart } from "../../lib/cart-context";
import { identifyStoreCustomerAction, placeOrderAction } from "../actions";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmedInvoiceNumber, setConfirmedInvoiceNumber] = useState<number | null>(null);

  async function handleIdentify() {
    setIdentifyError(null);
    setIdentifying(true);
    try {
      const result = await identifyStoreCustomerAction(
        phone,
        name || undefined,
        items.map((i) => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
      );
      if (result.error) {
        setIdentifyError(result.error);
        return;
      }
      setCustomer({ id: result.customerId!, name: result.customerName ?? name });
    } finally {
      setIdentifying(false);
    }
  }

  async function handlePlaceOrder() {
    if (!customer) return;
    setOrderError(null);
    setPlacing(true);
    try {
      const result = await placeOrderAction(items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
      if (result.error) {
        setOrderError(result.error);
        return;
      }
      setConfirmedInvoiceNumber(result.invoiceNumber ?? 0);
      clear();
    } finally {
      setPlacing(false);
    }
  }

  useEffect(() => {
    if (items.length === 0 && confirmedInvoiceNumber === null) router.replace("/cart");
  }, [items.length, confirmedInvoiceNumber, router]);

  if (confirmedInvoiceNumber !== null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-black">تم استلام طلبك ✓</h1>
        <p className="mt-2 text-foreground/70">رقم الطلب: {confirmedInvoiceNumber}</p>
        <p className="mt-1 text-sm text-foreground/60">الدفع عند الاستلام — سيتواصل معك فريقنا قريبًا</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 rounded-full bg-foreground px-6 py-3 text-sm font-extrabold text-background"
        >
          العودة للمتجر
        </button>
      </main>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-32 pt-8">
      <h1 className="mb-6 text-xl font-black">إتمام الطلب</h1>

      <div className="space-y-2 border-b border-border pb-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 text-base font-black">
          <span>الإجمالي (شامل الضريبة)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="block text-sm font-bold">رقم جوالك</label>
        <div className="flex gap-2">
          <input
            dir="ltr"
            placeholder="05xxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!!customer}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm outline-none disabled:opacity-60"
          />
          {!customer ? (
            <button
              type="button"
              onClick={handleIdentify}
              disabled={identifying || phone.length < 10}
              className="rounded-xl bg-foreground px-5 text-sm font-extrabold text-background disabled:opacity-50"
            >
              {identifying ? "..." : "متابعة"}
            </button>
          ) : (
            <button type="button" onClick={() => setCustomer(null)} className="rounded-xl border border-border px-5 text-sm font-bold">
              تغيير
            </button>
          )}
        </div>
        {!customer ? (
          <input
            placeholder="اسمك (لعميل جديد فقط)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none"
          />
        ) : (
          <p className="text-sm text-foreground/70">أهلًا {customer.name} 👋</p>
        )}
        {identifyError ? <p className="text-sm text-destructive">{identifyError}</p> : null}
      </div>

      {orderError ? <p className="mt-4 text-sm text-destructive">{orderError}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            disabled={!customer || placing}
            onClick={handlePlaceOrder}
            className="w-full rounded-full bg-foreground py-3.5 text-sm font-extrabold text-background disabled:opacity-50"
          >
            {placing ? "جارٍ إرسال الطلب..." : "تأكيد الطلب (الدفع عند الاستلام)"}
          </button>
        </div>
      </div>
    </main>
  );
}
