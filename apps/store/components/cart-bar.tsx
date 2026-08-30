"use client";

import Link from "next/link";
import { formatCurrency } from "@system2026/utils";
import { useCart } from "../lib/cart-context";

// شريط عائم يظهر فقط عند وجود عناصر بالسلة — لا يغيّر أي تصميم حالي للمتجر
// عند عدم استخدام الطلب الجديد إطلاقًا (سلة فارغة = لا شيء يظهر).
export function CartBar() {
  const { totalCount, subtotal } = useCart();

  if (totalCount === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full bg-foreground px-5 py-3.5 text-background shadow-pop"
    >
      <span className="text-sm font-bold">{totalCount} منتج بالسلة</span>
      <span className="text-sm font-black">{formatCurrency(subtotal)}</span>
    </Link>
  );
}
