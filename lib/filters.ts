// Catalog search, filters and sorting (pure, shared by the catalog page and tests).
import { colorKey, isInStock, priceRange } from "./catalog";
import type { Category, Product } from "./types";

export type Sort = "newest" | "price-asc" | "price-desc";
export interface Filters {
  q: string;
  category: string;
  sizes: string[];
  colors: string[];
  min: string;
  max: string;
  inStock: boolean;
  sort: Sort;
}

export const EMPTY_FILTERS: Filters = { q: "", category: "", sizes: [], colors: [], min: "", max: "", inStock: false, sort: "newest" };

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];
export function sizeRank(label: string) {
  const i = SIZE_ORDER.indexOf(label.toUpperCase());
  if (i >= 0) return i;
  const n = parseFloat(label);
  return Number.isFinite(n) ? 100 + n : 10_000;
}

/** Pure filtering + sorting, exported for tests. */
export function applyFilters(products: Product[], categories: Category[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  const cat = categories.find((c) => c.slug === f.category);
  const min = f.min ? Math.round(parseFloat(f.min) * 100) : null;
  const max = f.max ? Math.round(parseFloat(f.max) * 100) : null;
  const out = products.filter((p) => {
    if (q && !`${p.name.ru} ${p.name.en}`.toLowerCase().includes(q)) return false;
    if (cat && p.categoryId !== cat.id) return false;
    if (f.inStock && !isInStock(p)) return false;
    const ok = (v: Product["variants"][number]) => !f.inStock || v.stock > 0;
    if (f.sizes.length) {
      const ids = new Set(p.sizes.filter((s) => f.sizes.includes(s.label)).map((s) => s.id));
      if (!p.variants.some((v) => v.sizeId && ids.has(v.sizeId) && ok(v))) return false;
    }
    if (f.colors.length) {
      const ids = new Set(p.colors.filter((c) => f.colors.includes(colorKey(c.name))).map((c) => c.id));
      if (!p.variants.some((v) => v.colorId && ids.has(v.colorId) && ok(v))) return false;
    }
    const range = priceRange(p);
    if (min != null && Number.isFinite(min) && range.max < min) return false;
    if (max != null && Number.isFinite(max) && range.min > max) return false;
    return true;
  });
  const sorted = [...out];
  if (f.sort === "price-asc") sorted.sort((a, b) => priceRange(a).min - priceRange(b).min);
  else if (f.sort === "price-desc") sorted.sort((a, b) => priceRange(b).min - priceRange(a).min);
  else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sorted;
}

export function toQuery(f: Filters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.category) sp.set("category", f.category);
  if (f.sizes.length) sp.set("size", f.sizes.join(","));
  if (f.colors.length) sp.set("color", f.colors.join(","));
  if (f.min) sp.set("min", f.min);
  if (f.max) sp.set("max", f.max);
  if (f.inStock) sp.set("instock", "1");
  if (f.sort !== "newest") sp.set("sort", f.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Reads filters from the catalog URL (?q=&category=&size=M,L&color=&min=&max=&instock=1&sort=). */
export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const list = (k: string) => one(k).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
  const sort = one("sort");
  return {
    q: one("q").slice(0, 100),
    category: one("category").slice(0, 80),
    sizes: list("size"),
    colors: list("color"),
    min: one("min").replace(/[^\d.]/g, ""),
    max: one("max").replace(/[^\d.]/g, ""),
    inStock: one("instock") === "1",
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "newest",
  };
}
