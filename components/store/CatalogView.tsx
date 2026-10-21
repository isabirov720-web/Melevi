"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { colorKey, tr } from "@/lib/catalog";
import { applyFilters, EMPTY_FILTERS, sizeRank, toQuery, type Filters, type Sort } from "@/lib/filters";
import type { Category, Product } from "@/lib/types";
import { useStore } from "./StoreProvider";
import { CloseIcon, FilterIcon, SearchIcon } from "./Icons";

export function CatalogView({
  products,
  categories,
  initial,
  cards,
}: {
  products: Product[];
  categories: Category[];
  initial: Filters;
  /** Server-rendered product cards, keyed by product id. */
  cards: Record<string, ReactNode>;
}) {
  const { t, locale, currency } = useStore();
  const [f, setF] = useState<Filters>(initial);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => applyFilters(products, categories, f), [products, categories, f]);

  const sizeOptions = useMemo(
    () => [...new Set(products.flatMap((p) => p.sizes.map((s) => s.label)))].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b)),
    [products],
  );
  const colorOptions = useMemo(() => {
    const map = new Map<string, { key: string; name: string; hex: string }>();
    for (const p of products) for (const c of p.colors) {
      const key = colorKey(c.name);
      if (!map.has(key)) map.set(key, { key, name: tr(c.name, locale), hex: c.hex });
    }
    return [...map.values()];
  }, [products, locale]);
  const usedCategories = categories.filter((c) => products.some((p) => p.categoryId === c.id));

  useEffect(() => {
    window.history.replaceState(null, "", `/catalog${toQuery(f)}`);
  }, [f]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const toggle = (k: "sizes" | "colors", v: string) =>
    setF((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }));
  const activeCount =
    (f.category ? 1 : 0) + f.sizes.length + f.colors.length + (f.min ? 1 : 0) + (f.max ? 1 : 0) + (f.inStock ? 1 : 0);
  const hasAny = activeCount > 0 || !!f.q;
  const clear = () => setF({ ...EMPTY_FILTERS, sort: f.sort });
  const symbol = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

  return (
    <div className="catalog">
      <div className="catalog-toolbar">
        <label className="search">
          <SearchIcon width={18} height={18} />
          <span className="sr-only">{t("catalog.search")}</span>
          <input type="search" value={f.q} onChange={(e) => set("q", e.target.value)} placeholder={t("catalog.search")} enterKeyHint="search" />
        </label>
        <button type="button" className="btn btn-outline filters-btn" onClick={() => setPanelOpen(true)} aria-expanded={panelOpen} aria-controls="filters">
          <FilterIcon width={18} height={18} /> {t("catalog.filters")}
          {activeCount > 0 && <span className="pill-count">{activeCount}</span>}
        </button>
        <label className="sort">
          <span className="sr-only">{t("catalog.sort")}</span>
          <select value={f.sort} onChange={(e) => set("sort", e.target.value as Sort)}>
            <option value="newest">{t("catalog.sort.newest")}</option>
            <option value="price-asc">{t("catalog.sort.priceAsc")}</option>
            <option value="price-desc">{t("catalog.sort.priceDesc")}</option>
          </select>
        </label>
      </div>

      {usedCategories.length > 0 && (
        <div className="chips" role="group" aria-label={t("catalog.category")}>
          <button type="button" className={`chip ${!f.category ? "active" : ""}`} aria-pressed={!f.category} onClick={() => set("category", "")}>
            {t("catalog.all")}
          </button>
          {usedCategories.map((c) => (
            <button key={c.id} type="button" className={`chip ${f.category === c.slug ? "active" : ""}`} aria-pressed={f.category === c.slug} onClick={() => set("category", f.category === c.slug ? "" : c.slug)}>
              {tr(c.name, locale)}
            </button>
          ))}
        </div>
      )}

      <div className="catalog-layout">
        <div className={`drawer-backdrop filters-backdrop ${panelOpen ? "open" : ""}`} onClick={() => setPanelOpen(false)} aria-hidden />
        <aside id="filters" ref={panelRef} className={`filters ${panelOpen ? "open" : ""}`} aria-label={t("catalog.filters")}>
          <div className="drawer-head filters-head">
            <span className="eyebrow">{t("catalog.filters")}</span>
            <button type="button" className="icon-btn" aria-label={t("nav.close")} onClick={() => setPanelOpen(false)}><CloseIcon /></button>
          </div>
          {sizeOptions.length > 0 && (
            <fieldset className="filter-group">
              <legend>{t("catalog.size")}</legend>
              <div className="option-row">
                {sizeOptions.map((s) => (
                  <button key={s} type="button" className={`size-btn ${f.sizes.includes(s) ? "active" : ""}`} aria-pressed={f.sizes.includes(s)} onClick={() => toggle("sizes", s)}>{s}</button>
                ))}
              </div>
            </fieldset>
          )}
          {colorOptions.length > 0 && (
            <fieldset className="filter-group">
              <legend>{t("catalog.color")}</legend>
              <div className="option-col">
                {colorOptions.map((c) => (
                  <label key={c.key} className="check">
                    <input type="checkbox" checked={f.colors.includes(c.key)} onChange={() => toggle("colors", c.key)} />
                    <span className="swatch" style={{ background: c.hex }} aria-hidden /> {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="filter-group">
            <legend>{t("catalog.price")}, {symbol}</legend>
            <div className="price-inputs">
              <label>
                <span className="sr-only">{t("catalog.price")} {t("catalog.priceFrom")}</span>
                <input inputMode="decimal" placeholder={t("catalog.priceFrom")} value={f.min} onChange={(e) => set("min", e.target.value.replace(/[^\d.]/g, ""))} />
              </label>
              <span aria-hidden>—</span>
              <label>
                <span className="sr-only">{t("catalog.price")} {t("catalog.priceTo")}</span>
                <input inputMode="decimal" placeholder={t("catalog.priceTo")} value={f.max} onChange={(e) => set("max", e.target.value.replace(/[^\d.]/g, ""))} />
              </label>
            </div>
          </fieldset>
          <fieldset className="filter-group">
            <legend className="sr-only">{t("stock.in")}</legend>
            <label className="check">
              <input type="checkbox" checked={f.inStock} onChange={(e) => set("inStock", e.target.checked)} /> {t("catalog.inStock")}
            </label>
          </fieldset>
          <div className="filters-actions">
            <button type="button" className="btn btn-outline" onClick={clear} disabled={!hasAny}>{t("catalog.clear")}</button>
            <button type="button" className="btn btn-dark filters-show" onClick={() => setPanelOpen(false)}>{t("catalog.show", { n: results.length })}</button>
          </div>
        </aside>

        <div className="catalog-results">
          <p className="results-meta" aria-live="polite">
            {t("catalog.count", { n: results.length })}
            {hasAny && <button type="button" className="link-btn" onClick={() => setF({ ...EMPTY_FILTERS, sort: f.sort })}>{t("catalog.clear")}</button>}
          </p>
          {results.length ? (
            <div className="product-grid grid-3">{results.map((p) => <div key={p.id} className="grid-item">{cards[p.id]}</div>)}</div>
          ) : (
            <div className="empty-state">
              <h2 className="section-title">{t("catalog.emptyTitle")}</h2>
              <p className="muted">{t("catalog.emptyText")}</p>
              <button type="button" className="btn btn-dark" onClick={() => setF(EMPTY_FILTERS)}>{t("catalog.clear")}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
