"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input, Select } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { identifyCustomerAction, checkoutAction, logoutAction, type ReceiptData } from "./actions";
import { ThermalReceipt } from "../../components/thermal-receipt";

export type PosProduct = { id: string; name: string; price: number; imageUrl: string | null; available: number };

type CartLine = { productId: string; name: string; price: number; available: number; quantity: number };

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "transfer", label: "تحويل بنكي" },
  { value: "credit", label: "آجل (دين على العميل)" },
] as const;

export function PosScreen({ products, employeeName }: { products: PosProduct[]; employeeName: string }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState<{ id: string; name: string; loyaltyPoints: number } | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("cash");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.includes(search.trim())),
    [products, search],
  );

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + (line.price / 1.15) * line.quantity, 0);
    const vat = subtotal * 0.15;
    return { subtotal, vat, total: subtotal + vat };
  }, [cart]);

  function addToCart(product: PosProduct) {
    if (product.available <= 0) return;
    setCart((lines) => {
      const existing = lines.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.available) return lines;
        return lines.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...lines, { productId: product.id, name: product.name, price: product.price, available: product.available, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((lines) =>
      lines
        .map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, l.available) } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((lines) => lines.filter((l) => l.productId !== productId));
  }

  async function handleIdentify() {
    setIdentifyError(null);
    setIdentifying(true);
    try {
      const result = await identifyCustomerAction(phone, customerName || undefined);
      if (result.error) {
        setIdentifyError(result.error);
        setCustomer(null);
        return;
      }
      setCustomer({ id: result.customerId!, name: result.customerName ?? customerName, loyaltyPoints: result.loyaltyPoints ?? 0 });
    } finally {
      setIdentifying(false);
    }
  }

  async function handleCheckout() {
    if (!customer || cart.length === 0) return;
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const result = await checkoutAction({
        customerId: customer.id,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        paymentMethod,
      });
      if (result.error) {
        setCheckoutError(result.error);
        return;
      }
      setReceipt(result.receipt ?? null);
      setCart([]);
      setCustomer(null);
      setPhone("");
      setCustomerName("");
    } finally {
      setCheckingOut(false);
    }
  }

  function startNewSale() {
    setReceipt(null);
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-4">
        <ThermalReceipt receipt={receipt} />
        <div className="no-print flex gap-2">
          <Button className="flex-1" onClick={() => window.print()}>
            طباعة الإيصال
          </Button>
          <Button className="flex-1" variant="outline" onClick={startNewSale}>
            بيع جديد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex-1 space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{employeeName}</h1>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              تسجيل خروج
            </Button>
          </form>
        </div>
        <Input placeholder="ابحث عن منتج..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              disabled={product.available <= 0}
              onClick={() => addToCart(product)}
              className="rounded-xl border border-border p-3 text-right transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="font-medium">{product.name}</p>
              <p className="mt-1 text-sm text-foreground/60">{formatCurrency(product.price)}</p>
              {product.available <= 0 ? (
                <Badge variant="danger" className="mt-1">
                  نفدت الكمية
                </Badge>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <Card className="w-full space-y-4 rounded-none lg:w-96">
        <h2 className="font-semibold">السلة</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {cart.map((line) => (
            <div key={line.productId} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1">{line.name}</span>
              <Input
                type="number"
                min={1}
                max={line.available}
                value={line.quantity}
                onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                className="h-9 w-16 text-center"
              />
              <span className="w-20 text-left">{formatCurrency(line.price * line.quantity)}</span>
              <button type="button" onClick={() => removeLine(line.productId)} className="text-foreground/50 hover:text-destructive">
                ✕
              </button>
            </div>
          ))}
          {cart.length === 0 ? <p className="text-sm text-foreground/60">السلة فارغة</p> : null}
        </div>

        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span>قبل الضريبة</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>الضريبة</span>
            <span>{formatCurrency(totals.vat)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>الإجمالي</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <label className="block text-sm">جوال العميل</label>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              placeholder="05xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!!customer}
            />
            {!customer ? (
              <Button onClick={handleIdentify} disabled={identifying || phone.length < 10}>
                {identifying ? "..." : "بحث"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setCustomer(null)}>
                تغيير
              </Button>
            )}
          </div>
          {!customer ? (
            <Input placeholder="اسم العميل (لعميل جديد فقط)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          ) : null}
          {identifyError ? <p className="text-sm text-destructive">{identifyError}</p> : null}
          {customer ? (
            <p className="text-sm text-foreground/70">
              {customer.name} — رصيد النقاط: {customer.loyaltyPoints}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="block text-sm">طريقة الدفع</label>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        {checkoutError ? <p className="text-sm text-destructive">{checkoutError}</p> : null}

        <Button className="w-full" disabled={!customer || cart.length === 0 || checkingOut} onClick={handleCheckout}>
          {checkingOut ? "جارٍ إتمام البيع..." : "إتمام البيع"}
        </Button>
      </Card>
    </div>
  );
}
