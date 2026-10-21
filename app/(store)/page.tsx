import Link from "next/link";
import { getCategories, getProducts, getSettings, getT } from "@/lib/store-server";
import { tr } from "@/lib/catalog";
import { instagramLinks } from "@/lib/order";
import { ProductCard } from "@/components/store/ProductCard";
import { Img } from "@/components/store/Img";
import { ArrowRight, InstagramIcon } from "@/components/store/Icons";

export default async function HomePage() {
  const [settings, categories, products, { locale, t }] = await Promise.all([getSettings(), getCategories(), getProducts(), getT()]);
  const { sections } = settings;
  const headline = tr(settings.heroHeadline, locale);
  const subtitle = tr(settings.heroSubtitle, locale);
  const newArrivals = products.filter((p) => p.isNew).slice(0, 8);
  const featured = products.filter((p) => p.isFeatured).slice(0, 8);
  const catsWithItems = categories
    .map((c) => ({ ...c, cover: products.find((p) => p.categoryId === c.id && p.images[0])?.images[0]?.url ?? null }))
    .filter((c) => products.some((p) => p.categoryId === c.id));
  const aboutText = tr(settings.aboutText, locale);
  const ig = instagramLinks(settings.contacts.instagramUrl);
  const card = (p: (typeof products)[number], i: number) => (
    <ProductCard key={p.id} product={p} locale={locale} currency={settings.currency} priority={i < 2} />
  );

  return (
    <>
      <section className={`hero ${settings.heroImageUrl ? "" : "hero-plain"}`}>
        {settings.heroImageUrl && (
          <Img src={settings.heroImageUrl} alt="" fill priority sizes="100vw" className="hero-img" />
        )}
        <div className="hero-content container">
          {headline && <h1 className="hero-title">{headline}</h1>}
          {subtitle && <p className="hero-sub">{subtitle}</p>}
          <Link href="/catalog" className="btn btn-light">
            {t("hero.cta")} <ArrowRight width={18} height={18} />
          </Link>
        </div>
      </section>

      {products.length === 0 && (
        <section className="section container empty-state">
          <h2 className="section-title">{t("home.empty")}</h2>
          <p className="muted">{t("home.emptyText")}</p>
        </section>
      )}

      {sections.categories && catsWithItems.length > 0 && (
        <section className="section container reveal" aria-labelledby="h-cats">
          <div className="section-head">
            <h2 id="h-cats" className="section-title">{t("home.categories")}</h2>
          </div>
          <ul className="category-rail">
            {catsWithItems.map((c) => (
              <li key={c.id}>
                <Link href={`/catalog?category=${c.slug}`} className="category-tile">
                  {c.cover && <Img src={c.cover} alt="" fill sizes="(max-width: 640px) 60vw, 25vw" className="tile-img" />}
                  <span className="tile-label">{tr(c.name, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.newArrivals && newArrivals.length > 0 && (
        <section className="section container reveal" aria-labelledby="h-new">
          <div className="section-head">
            <h2 id="h-new" className="section-title">{t("home.new")}</h2>
            <Link href="/catalog?sort=newest" className="link-arrow">{t("home.viewAll")} <ArrowRight width={16} height={16} /></Link>
          </div>
          <div className="product-grid">{newArrivals.map(card)}</div>
        </section>
      )}

      {sections.featured && featured.length > 0 && (
        <section className="section container reveal" aria-labelledby="h-feat">
          <div className="section-head">
            <h2 id="h-feat" className="section-title">{t("home.featured")}</h2>
            <Link href="/catalog" className="link-arrow">{t("home.viewAll")} <ArrowRight width={16} height={16} /></Link>
          </div>
          <div className="product-grid">{featured.map(card)}</div>
        </section>
      )}

      {sections.about && aboutText && (
        <section className="section about-band reveal" aria-labelledby="h-about">
          <div className="container about-inner">
            <h2 id="h-about" className="section-title">{tr(settings.aboutTitle, locale) || t("about.title")}</h2>
            <div className="prose">
              {aboutText.split(/\n{2,}/).slice(0, 2).map((para, i) => <p key={i}>{para}</p>)}
            </div>
            <Link href="/about" className="link-arrow">{t("nav.about")} <ArrowRight width={16} height={16} /></Link>
          </div>
        </section>
      )}

      {sections.instagram && ig && (
        <section className="section container insta-band reveal">
          <InstagramIcon width={28} height={28} />
          <h2 className="section-title">{t("home.instagram")}</h2>
          <p className="muted">{t("home.instagramText")}</p>
          <a href={ig.profile} target="_blank" rel="noopener noreferrer" className="btn btn-outline">@{ig.username}</a>
        </section>
      )}
    </>
  );
}
