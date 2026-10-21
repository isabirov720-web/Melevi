// Pure catalog helpers shared by server and client code.
import type { Locale, LocalizedText, Product, ProductVariant } from "./types";

export function tr(text: LocalizedText | null | undefined, locale: Locale): string {
  if (!text) return "";
  return (text[locale] || text.ru || text.en || "").trim();
}

export function variantKey(colorId: string | null, sizeId: string | null) {
  return `${colorId ?? "-"}|${sizeId ?? "-"}`;
}

/** Every color × size combination a product must have a variant for. */
export function expectedVariantKeys(p: { colors: { id: string }[]; sizes: { id: string }[] }) {
  const colors: (string | null)[] = p.colors.length ? p.colors.map((c) => c.id) : [null];
  const sizes: (string | null)[] = p.sizes.length ? p.sizes.map((s) => s.id) : [null];
  const keys: { colorId: string | null; sizeId: string | null }[] = [];
  for (const colorId of colors) for (const sizeId of sizes) keys.push({ colorId, sizeId });
  return keys;
}

/**
 * Rebuilds the variant list so it exactly matches the product's colors and sizes,
 * keeping ids, stock and prices of variants that still exist.
 */
export function syncVariants<V extends { colorId: string | null; sizeId: string | null }>(
  p: { colors: { id: string }[]; sizes: { id: string }[]; variants: V[] },
  create: (colorId: string | null, sizeId: string | null) => V,
): V[] {
  const existing = new Map(p.variants.map((v) => [variantKey(v.colorId, v.sizeId), v]));
  return expectedVariantKeys(p).map(({ colorId, sizeId }) => existing.get(variantKey(colorId, sizeId)) ?? create(colorId, sizeId));
}

export function findVariant(p: Product, colorId: string | null, sizeId: string | null) {
  return p.variants.find((v) => v.colorId === colorId && v.sizeId === sizeId) ?? null;
}

export function variantPrice(p: Product, v: ProductVariant | null) {
  return v?.price ?? p.price;
}

export function totalStock(p: Product) {
  return p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

export function isInStock(p: Product) {
  return p.variants.some((v) => v.stock > 0);
}

export function isOnSale(p: Product) {
  return p.compareAtPrice != null && p.compareAtPrice > p.price;
}

/** Lowest and highest price a customer can pay for this product. */
export function priceRange(p: Product) {
  const prices = p.variants.length ? p.variants.map((v) => variantPrice(p, v)) : [p.price];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function availableSizeIds(p: Product, colorId?: string | null) {
  return new Set(
    p.variants
      .filter((v) => v.stock > 0 && (colorId === undefined || v.colorId === colorId))
      .map((v) => v.sizeId)
      .filter((id): id is string => !!id),
  );
}

export function availableColorIds(p: Product) {
  return new Set(
    p.variants
      .filter((v) => v.stock > 0)
      .map((v) => v.colorId)
      .filter((id): id is string => !!id),
  );
}

export function mainImage(p: Product) {
  return p.images[0]?.url ?? null;
}

/** First photo linked to a color, if any. */
export function imageIndexForColor(p: Product, colorId: string | null) {
  if (!colorId) return -1;
  return p.images.findIndex((img) => img.colorId === colorId);
}

export function colorKey(name: LocalizedText) {
  return (name.ru || name.en).trim().toLowerCase();
}

export type Selection =
  | { state: "missing"; missing: "color" | "size" }
  | { state: "unavailable"; variant: ProductVariant | null }
  | { state: "ok"; variant: ProductVariant };

/** Decides whether the customer's current choice can be added to the cart. */
export function resolveSelection(p: Product, colorId: string | null, sizeId: string | null): Selection {
  if (p.colors.length && !colorId) return { state: "missing", missing: "color" };
  if (p.sizes.length && !sizeId) return { state: "missing", missing: "size" };
  const v = findVariant(p, p.colors.length ? colorId : null, p.sizes.length ? sizeId : null);
  if (!v || v.stock <= 0) return { state: "unavailable", variant: v };
  return { state: "ok", variant: v };
}
