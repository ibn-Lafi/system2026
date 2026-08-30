"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@system2026/utils";
import { useCart } from "../../lib/cart-context";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-lg px-5 pb-32 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="رجوع">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-xl font-black">سلتي</h1>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-foreground/60">
          <p>السلة فارغة</p>
          <Link href="/" className="mt-4 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-extrabold text-background">
            تصفّح المنتجات
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 border-b border-border pb-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                  <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="h-6 w-6">
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="h-6 w-6">
                    +
                  </button>
                </div>
                <button type="button" onClick={() => removeItem(item.productId)} className="text-foreground/40" aria-label="إزالة">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="text-lg font-black">{formatCurrency(subtotal)}</p>
              </div>
              <Link
                href="/checkout"
                className="flex-1 rounded-full bg-foreground py-3.5 text-center text-sm font-extrabold text-background"
              >
                المتابعة للدفع
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
