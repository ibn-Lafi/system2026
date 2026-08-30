import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@system2026/utils";
import { getStoreProduct } from "../../../lib/get-catalog";
import { WaveDivider } from "../../../components/wave-divider";
import { AddToCartControl } from "../../../components/add-to-cart-control";

function PlaceholderIcon() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-background/45"
      aria-hidden="true"
    >
      <path d="M21 8.5 12 4 3 8.5 12 13l9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </svg>
  );
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getStoreProduct(params.id);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-2xl pb-12">
      {/* الصورة الرئيسية (خلفية سوداء) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-foreground sm:aspect-[16/10]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlaceholderIcon />
          </div>
        )}

        <Link
          href="/"
          aria-label="العودة للمتجر"
          className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-background/40 text-background"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {product.category_name ? (
          <span className="absolute bottom-9 end-4 rounded-full border-[1.5px] border-background/40 px-3.5 py-1.5 text-[12.5px] font-bold text-background">
            {product.category_name}
          </span>
        ) : null}

        <WaveDivider position="bottom" fill="white" />
      </div>

      {/* بطاقة المحتوى */}
      <div className="flex flex-col gap-4 px-5 pt-7 sm:px-6 sm:pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[23px] font-black leading-snug tracking-tight">{product.name}</h1>
          <span className="w-fit rounded-full border-[1.5px] border-foreground px-3 py-1.5 text-[12.5px] font-extrabold">
            الوحدة: {product.base_unit_name}
          </span>
        </div>

        {product.description ? (
          <p className="text-[14.5px] leading-[1.85] text-foreground/80">{product.description}</p>
        ) : null}

        <div className="h-px w-full bg-border" />

        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-black">{formatCurrency(product.price)}</span>
          <span className="text-[13.5px] text-muted-foreground">/ {product.base_unit_name}</span>
        </div>

        <AddToCartControl
          productId={product.id}
          name={product.name}
          price={product.price}
          imageUrl={product.image_url}
        />
      </div>
    </main>
  );
}
