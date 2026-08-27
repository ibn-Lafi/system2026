import { getStoreProducts, getStorePointsOfSale } from "../lib/get-catalog";
import { getStoreSettings } from "../lib/get-store-settings";
import { getStoreSections } from "../lib/get-store-sections";
import { ProductCard } from "../components/product-card";
import { PointsOfSaleSection } from "../components/points-of-sale-section";
import { StoreSections } from "../components/store-sections";
import { WaveDivider } from "../components/wave-divider";
import { LandingHero } from "../components/landing-hero";

export default async function HomePage() {
  const settings = await getStoreSettings();

  if (settings.show_landing_page) {
    return <LandingHero heroKicker={settings.hero_kicker} heroTitle={settings.hero_title} />;
  }

  const [products, locations, sections] = await Promise.all([
    getStoreProducts(),
    getStorePointsOfSale(),
    getStoreSections(),
  ]);

  return (
    <main className="pb-16">
      {/* شريط ترحيبي أسود */}
      <section className="relative bg-foreground px-5 pb-14 pt-8 text-background lg:px-8 lg:pb-20 lg:pt-14">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl">
          <div className="max-w-md">
            <span className="text-[12px] font-bold tracking-[0.15em] text-background/60">{settings.hero_kicker}</span>
            <h1 className="mt-2.5 text-[28px] font-black leading-[1.25] lg:text-[42px]">{settings.hero_title}</h1>
          </div>
        </div>
        <WaveDivider position="bottom" fill="white" />
      </section>

      <div className="mx-auto max-w-5xl px-5 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
        <h2 className="mb-4 mt-10 text-[19px] font-black lg:mt-14 lg:text-[22px]">كل المنتجات</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">لا توجد منتجات حاليًا</p>
        ) : null}
      </div>

      <StoreSections sections={sections} />

      {settings.custom_html ? (
        <div
          className="mx-auto max-w-5xl px-5 lg:max-w-6xl lg:px-8 xl:max-w-7xl"
          dangerouslySetInnerHTML={{ __html: settings.custom_html }}
        />
      ) : null}

      {settings.show_points_of_sale_section ? <PointsOfSaleSection locations={locations} /> : null}
    </main>
  );
}
