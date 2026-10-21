import Link from "next/link";
import { availableColorIds, availableSizeIds, isInStock, isOnSale, priceRange, totalStock, tr } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { translate } from "@/lib/i18n";
import type { Locale, Product } from "@/lib/types";
import { Img } from "./Img";

export function ProductCard({ product: p, locale, currency, priority = false }: { product: Product; locale: Locale; currency: string; priority?: boolean }) {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, number>) => translate(locale, k, v);
  const money = (n: number) => formatMoney(n, currency, locale);
  const name = tr(p.name, locale);
  const inStock = isInStock(p);
  const stock = totalStock(p);
  const sale = isOnSale(p);
  const { min, max } = priceRange(p);
  const sizesOk = availableSizeIds(p);
  const colorsOk = availableColorIds(p);
  const [first, second] = p.images;

  return (
    <article className={`product-card ${inStock ? "" : "is-sold-out"}`}>
      <Link href={`/product/${p.slug}`} className="card-media" aria-label={name}>
        {first ? (
          <Img src={first.url} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={priority} className="card-img" />
        ) : (
          <span className="card-noimg" aria-hidden>{name.slice(0, 1)}</span>
        )}
        {second && <Img src={second.url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="card-img card-img-alt" />}
        <span className="badges">
          {p.isDemo && <span className="badge badge-demo">{t("badge.demo")}</span>}
          {p.isNew && <span className="badge">{t("badge.new")}</span>}
          {sale && <span className="badge badge-sale">{t("badge.sale")}</span>}
          {!inStock && <span className="badge badge-muted">{t("badge.soldOut")}</span>}
        </span>
      </Link>
      <div className="card-body">
        <h3 className="card-title"><Link href={`/product/${p.slug}`}>{name}</Link></h3>
        <p className="price">
          <span className={sale ? "price-now sale" : "price-now"}>
            {min !== max ? `${t("catalog.priceFrom")} ` : ""}
            {money(min)}
          </span>
          {sale && <s className="price-was" aria-label="Original price">{money(p.compareAtPrice!)}</s>}
        </p>
        {p.colors.length > 0 && (
          <ul className="swatches" aria-label={translate(locale, "product.color")}>
            {p.colors.map((c) => (
              <li key={c.id} title={tr(c.name, locale)} className={colorsOk.has(c.id) ? "" : "off"}>
                <span className="swatch" style={{ background: c.hex }} />
                <span className="sr-only">{tr(c.name, locale)}</span>
              </li>
            ))}
          </ul>
        )}
        {p.sizes.length > 0 && (
          <p className="card-sizes" aria-label={translate(locale, "product.size")}>
            {p.sizes.map((s) => (
              <span key={s.id} className={sizesOk.has(s.id) ? "" : "off"}>{s.label}</span>
            ))}
          </p>
        )}
        <p className={`stock ${inStock ? (stock <= 3 ? "low" : "in") : "out"}`}>
          {inStock ? (stock <= 3 ? t("stock.low", { n: stock }) : t("stock.in")) : t("stock.out")}
        </p>
      </div>
    </article>
  );
}
