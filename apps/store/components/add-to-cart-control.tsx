"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../lib/cart-context";

export function AddToCartControl({
  productId,
  name,
  price,
  imageUrl,
}: {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ productId, name, price, imageUrl }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 rounded-full border-[1.5px] border-foreground px-3 py-1.5">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-6 w-6 items-center justify-center text-lg"
          aria-label="إنقاص الكمية"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-bold">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => q + 1)}
          className="flex h-6 w-6 items-center justify-center text-lg"
          aria-label="زيادة الكمية"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex-1 rounded-full bg-foreground py-3 text-sm font-extrabold text-background transition-transform active:scale-95"
      >
        {added ? "أُضيف ✓" : "أضف للسلة"}
      </button>
      {added ? (
        <button
          type="button"
          onClick={() => router.push("/cart")}
          className="text-xs font-bold underline underline-offset-2"
        >
          عرض السلة
        </button>
      ) : null}
    </div>
  );
}
