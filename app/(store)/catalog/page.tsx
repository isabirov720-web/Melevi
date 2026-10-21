import type { Metadata } from "next";
import { getCategories, getProducts, getSettings, getT } from "@/lib/store-server";
import { parseFilters } from "@/lib/filters";
import { tr } from "@/lib/catalog";
import { CatalogView } from "@/components/store/CatalogView";
import { ProductCard } from "@/components/store/ProductCard";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [{ t, locale }, categories, sp] = await Promise.all([getT(), getCategories(), searchParams]);
  const cat = categories.find((c) => c.slug === sp.category);
  const title = cat ? tr(cat.name, locale) : t("catalog.title");
  return { title, description: `${title} — ${(await getSettings()).storeName}`, alternates: { canonical: cat ? `/catalog?category=${cat.slug}` : "/catalog" } };
}

export default async function CatalogPage({ searchParams }: Props) {
  const [settings, categories, products, { t, locale }, sp] = await Promise.all([getSettings(), getCategories(), getProducts(), getT(), searchParams]);
  const cards = Object.fromEntries(
    products.map((p, i) => [p.id, <ProductCard key={p.id} product={p} locale={locale} currency={settings.currency} priority={i < 2} />]),
  );
  return (
    <div className="container page">
      <h1 className="page-title">{t("catalog.title")}</h1>
      <CatalogView products={products} categories={categories} initial={parseFilters(sp)} cards={cards} />
    </div>
  );
}
