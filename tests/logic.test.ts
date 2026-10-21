import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveSelection, syncVariants } from "../lib/catalog";
import { applyFilters, EMPTY_FILTERS, parseFilters } from "../lib/filters";
import { buildOrderText, cartTotal, whatsappLink } from "../lib/order";
import { formatMoney, parseMoney } from "../lib/format";
import { productInput } from "../lib/schema";
import { slugify } from "../lib/slug";
import type { Category, Product, ResolvedCartLine } from "../lib/types";

const demo = JSON.parse(readFileSync("data/demo.json", "utf8")) as { categories: Category[]; products: Product[] };
const bySlug = (s: string) => demo.products.find((p) => p.slug === s)!;
const amira = bySlug("demo-amira-dress");

test("money parsing and formatting", () => {
  assert.equal(parseMoney("120"), 12000);
  assert.equal(parseMoney("1 200,50"), 120050);
  assert.equal(parseMoney("-5"), null);
  assert.equal(parseMoney("12.345"), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(formatMoney(18900, "USD", "en"), "$189");
  assert.equal(formatMoney(18950, "USD", "en"), "$189.50");
});

test("slugify transliterates Russian names", () => {
  assert.equal(slugify("Платье «Амира» чёрное"), "plate-amira-chernoe");
  assert.equal(slugify("  Coat / Пальто 2026 "), "coat-palto-2026");
});

test("variants are rebuilt from colors × sizes, keeping existing stock", () => {
  let n = 0;
  const make = (colorId: string | null, sizeId: string | null) => ({ id: `new-${++n}`, colorId, sizeId, stock: 0, price: null });
  const extraSize = { id: "size-xxl", label: "XXL" };
  const next = syncVariants({ ...amira, sizes: [...amira.sizes, extraSize] }, make);
  assert.equal(next.length, amira.colors.length * (amira.sizes.length + 1));
  const blackS = amira.variants.find((v) => v.colorId === amira.colors[0].id && v.sizeId === amira.sizes[0].id)!;
  assert.deepEqual(next.find((v) => v.id === blackS.id), blackS, "existing variant keeps id and stock");
  assert.equal(next.filter((v) => v.sizeId === "size-xxl").every((v) => v.stock === 0), true);
  const single = syncVariants({ colors: [], sizes: [], variants: [] }, make);
  assert.equal(single.length, 1);
  assert.equal(single[0].colorId, null);
});

test("customers cannot choose missing options or unavailable variants", () => {
  const [black, ivory] = amira.colors;
  const size = (l: string) => amira.sizes.find((s) => s.label === l)!.id;
  assert.deepEqual(resolveSelection(amira, null, size("M")), { state: "missing", missing: "color" });
  assert.deepEqual(resolveSelection(amira, black.id, null), { state: "missing", missing: "size" });
  assert.equal(resolveSelection(amira, black.id, size("L")).state, "unavailable", "black L has stock 0");
  assert.equal(resolveSelection(amira, ivory.id, size("S")).state, "unavailable", "ivory S has stock 0");
  const ok = resolveSelection(amira, black.id, size("M"));
  assert.equal(ok.state, "ok");
  assert.equal(ok.state === "ok" && ok.variant.stock, 5);
  // Product without sizes (scarf): only color is required.
  const scarf = bySlug("demo-nur-scarf");
  assert.equal(resolveSelection(scarf, scarf.colors[0].id, null).state, "ok");
  assert.equal(resolveSelection(scarf, scarf.colors[1].id, null).state, "unavailable", "black scarf sold out");
});

test("search, filters and sorting", () => {
  const run = (f: Partial<typeof EMPTY_FILTERS>) => applyFilters(demo.products, demo.categories, { ...EMPTY_FILTERS, ...f }).map((p) => p.slug);
  assert.deepEqual(run({ q: "амира" }), ["demo-amira-dress"]);
  assert.deepEqual(run({ q: "TRENCH" }), ["demo-zeynep-trench"]);
  assert.deepEqual(run({ category: "demo-outerwear" }).sort(), ["demo-leyla-coat", "demo-zeynep-trench"]);
  assert.ok(!run({ inStock: true }).includes("demo-aisha-shirtdress"), "sold-out product hidden by in-stock filter");
  assert.ok(run({}).includes("demo-aisha-shirtdress"));
  assert.deepEqual(run({ sizes: ["XL"], inStock: true }), ["demo-amira-dress"], "only Amira has XL in stock");
  assert.deepEqual(run({ colors: ["оливковый"] }), ["demo-nur-scarf"]);
  assert.deepEqual(run({ min: "200", max: "300" }).sort(), ["demo-safiya-suit", "demo-zeynep-trench"]);
  const asc = applyFilters(demo.products, demo.categories, { ...EMPTY_FILTERS, sort: "price-asc" }).map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const newest = run({});
  assert.equal(newest[0], "demo-zeynep-trench");
  assert.deepEqual(parseFilters({ size: "S,M", sort: "evil", instock: "1" }).sizes, ["S", "M"]);
  assert.equal(parseFilters({ sort: "evil" }).sort, "newest");
});

const line = (o: Partial<ResolvedCartLine>): ResolvedCartLine => ({
  productId: "p", variantId: Math.random().toString(), qty: 1, slug: "demo-amira-dress", name: { ru: "Платье", en: "Dress" },
  image: null, color: null, size: null, unitPrice: 1000, stock: 5, available: true, ...o,
});

test("cart total counts only available lines", () => {
  const lines = [line({ qty: 2, unitPrice: 18900 }), line({ qty: 1, unitPrice: 4500 }), line({ qty: 3, unitPrice: 99900, available: false, stock: 0 })];
  assert.equal(cartTotal(lines), 2 * 18900 + 4500);
});

test("order request text includes variants, quantities and total", () => {
  const lines = [
    line({ qty: 2, unitPrice: 18900, color: { ru: "Чёрный", en: "Black" }, size: "M" }),
    line({ slug: "demo-nur-scarf", name: { ru: "Платок", en: "Scarf" }, unitPrice: 4500, color: { ru: "Песочный", en: "Sand" } }),
    line({ name: { ru: "Нет в наличии", en: "Sold out" }, available: false }),
  ];
  const text = buildOrderText({ lines, locale: "ru", currency: "USD", storeName: "MELEVI", siteUrl: "https://melevi.example/", deliveryChargedSeparately: true, comment: "Позвоните вечером" });
  assert.match(text, /заявку на заказ в MELEVI/);
  assert.match(text, /1\. Платье \(цвет: Чёрный, размер: M\)/);
  const m = (n: number) => formatMoney(n, "USD", "ru");
  assert.ok(text.includes(`2 × ${m(18900)} = ${m(37800)}`));
  assert.match(text, /2\. Платок \(цвет: Песочный\)/);
  assert.match(text, /https:\/\/melevi\.example\/product\/demo-nur-scarf/);
  assert.ok(text.includes(`Итого за товары: ${m(42300)}`));
  assert.match(text, /Доставка не включена/);
  assert.match(text, /Комментарий: Позвоните вечером/);
  assert.doesNotMatch(text, /Нет в наличии/, "unavailable items are excluded");
  const en = buildOrderText({ lines, locale: "en", currency: "USD", storeName: "MELEVI", siteUrl: "https://x.y", deliveryChargedSeparately: false });
  assert.match(en, /Dress \(color: Black, size: M\)/);
  assert.match(en, /Please confirm availability/);
  const wa = whatsappLink("+996 (555) 12-34-56", text)!;
  assert.ok(wa.startsWith("https://wa.me/996555123456?text="));
  assert.equal(decodeURIComponent(wa.split("text=")[1]), text);
  assert.equal(whatsappLink("", text), null);
});

test("server validation rejects bad prices, stock and unpublishable products", () => {
  const base = { ...amira, id: undefined };
  assert.equal(productInput.safeParse(base).success, true);
  const bad = (patch: object) => {
    const r = productInput.safeParse({ ...base, ...patch });
    assert.equal(r.success, false);
    return r.success ? "" : r.error.issues[0].message;
  };
  assert.match(bad({ price: -100 }), /отрицательной/);
  assert.match(bad({ price: 10.5 }), /неверно/);
  assert.match(bad({ compareAtPrice: amira.price }), /Старая цена/);
  assert.match(bad({ variants: amira.variants.map((v, i) => (i ? v : { ...v, stock: -1 })) }), /Остаток/);
  assert.match(bad({ images: [], status: "published" }), /фото/);
  assert.equal(productInput.safeParse({ ...base, images: [], status: "draft" }).success, true, "drafts may have no photos");
  assert.match(bad({ slug: "Плохой адрес" }), /латиница/);
  assert.match(bad({ images: [{ ...amira.images[0], url: "javascript:alert(1)" }] }), /изображение/);
});
