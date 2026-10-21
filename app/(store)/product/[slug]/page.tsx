import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts, getSettings, getT, siteUrl } from "@/lib/store-server";
import { isInStock, priceRange, tr } from "@/lib/catalog";
import { ProductView } from "@/components/store/ProductView";
import { ProductCard } from "@/components/store/ProductCard";
import { policyItems } from "@/components/store/Footer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [p, { locale }] = await Promise.all([getProductBySlug(slug), getT()]);
  if (!p) return { title: "404" };
  const title = tr(p.name, locale);
  const description = tr(p.description, locale).replace(/\s+/g, " ").slice(0, 160);
  const image = p.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title, description, type: "website", url: `/product/${p.slug}`, images: image && !image.endsWith(".svg") ? [{ url: image }] : undefined },
  };
}

function SizeChart({ text }: { text: string }) {
  const rows = text.split("\n").map((r) => r.split("|").map((c) => c.trim())).filter((r) => r.some(Boolean));
  if (rows.length < 2) return <p className="pre">{text}</p>;
  const [head, ...body] = rows;
  return (
    <div className="table-scroll">
      <table className="size-table">
        <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, settings, all, { t, locale }] = await Promise.all([getProductBySlug(slug), getSettings(), getProducts(), getT()]);
  if (!p) notFound();

  const description = tr(p.description, locale);
  const policies = policyItems(settings, locale);
  const related = [
    ...all.filter((x) => x.id !== p.id && p.categoryId && x.categoryId === p.categoryId),
    ...all.filter((x) => x.id !== p.id && x.categoryId !== p.categoryId),
  ].slice(0, 4);
  const url = `${siteUrl()}/product/${p.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tr(p.name, locale),
    description,
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl()}${i.url}`)),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: settings.currency,
      lowPrice: (priceRange(p).min / 100).toFixed(2),
      highPrice: (priceRange(p).max / 100).toFixed(2),
      availability: isInStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
  };

  return (
    <div className="container page product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductView product={p} productUrl={url}>
      <div className="product-details">
        {description && (
          <details className="accordion" open>
            <summary>{t("product.description")}</summary>
            <div className="prose">{description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
          </details>
        )}
        {p.sizeChart.trim() && (
          <details className="accordion">
            <summary>{t("product.sizeChart")}</summary>
            <SizeChart text={p.sizeChart} />
          </details>
        )}
        {policies.map((pol) => (
          <details key={pol.key} className="accordion">
            <summary>{pol.title}</summary>
            <p className="pre">{pol.text}</p>
          </details>
        ))}
        {!policies.length && <p className="muted small">{t("cart.deliveryConfirm")}</p>}
      </div>
      </ProductView>

      {related.length > 0 && (
        <section className="section" aria-labelledby="h-related">
          <div className="section-head"><h2 id="h-related" className="section-title">{t("product.related")}</h2></div>
          <div className="product-grid">
            {related.map((r) => <ProductCard key={r.id} product={r} locale={locale} currency={settings.currency} />)}
          </div>
        </section>
      )}
    </div>
  );
}
