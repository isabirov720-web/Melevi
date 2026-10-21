// End-to-end check of the essential owner/customer scenarios against a running server.
// Usage: npm run dev  (in another terminal)  →  npm run e2e
// Works in local mode (ADMIN_PASSWORD). Creates temporary records and removes them at the end.
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD && existsSync(".env.local")) PASSWORD = readFileSync(".env.local", "utf8").match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
const EMAIL = process.env.ADMIN_EMAIL || "";

let cookie = "";
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(["✓", name]);
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push(["✗", name]);
    console.log(`✗ ${name}\n   ${e.message}`);
    process.exitCode = 1;
  }
}

async function req(path, { method = "GET", body, auth = true, headers = {}, raw = false } = {}) {
  const h = { origin: BASE, "accept-language": "en", ...headers };
  if (auth && cookie) h.cookie = cookie;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    h["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: "manual" });
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers };
}
const page = (path) => req(path, { auth: false, headers: { cookie: "lang=en" } });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const uid = () => crypto.randomUUID();
const stamp = Date.now().toString(36);
let productId, categoryId, slug, imageUrl;
const ids = { black: uid(), white: uid(), s: uid(), m: uid() };

await step("Unauthorized visitors cannot modify store data", async () => {
  cookie = "";
  for (const [method, path] of [["PUT", "/api/admin/settings"], ["POST", "/api/admin/products"], ["DELETE", "/api/admin/products/" + uid()], ["POST", "/api/admin/categories"], ["DELETE", "/api/admin/demo"], ["GET", "/api/admin/export"]]) {
    const r = await req(path, { method, body: method === "GET" || method === "DELETE" ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${path} → ${r.status}`);
  }
  const fd = new FormData();
  fd.append("file", new Blob([PNG], { type: "image/png" }), "x.png");
  assert.equal((await req("/api/admin/upload", { method: "POST", body: fd })).status, 401);
  const adminPage = await req("/admin/products", { auth: false });
  assert.ok([302, 303, 307, 308].includes(adminPage.status) || /Вход для владельца/.test(adminPage.text), "admin page requires login");
  const forged = await req("/api/admin/settings", { method: "PUT", body: {}, headers: { cookie: "melevi_admin=9999999999999.forged" } });
  assert.equal(forged.status, 401, "forged session cookie rejected");
});

await step("Wrong password is rejected; owner can sign in", async () => {
  assert.ok(PASSWORD, "ADMIN_PASSWORD not found");
  const bad = await req("/api/admin/login", { method: "POST", body: { email: EMAIL, password: "wrong-password" } });
  assert.equal(bad.status, 401);
  const res = await req("/api/admin/login", { method: "POST", body: { email: EMAIL, password: PASSWORD }, raw: true });
  assert.equal(res.status, 200);
  cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  assert.ok(cookie, "session cookie set");
  const setCookie = res.headers.getSetCookie().join(";").toLowerCase();
  if (setCookie.includes("melevi_admin")) assert.ok(setCookie.includes("httponly"), "session cookie is HTTP-only");
});

await step("Cross-site requests are blocked even with a session", async () => {
  const r = await req("/api/admin/categories", { method: "POST", body: { name: { ru: "x", en: "" }, slug: "x", visible: true }, headers: { origin: "https://evil.example" } });
  assert.equal(r.status, 403);
});

await step("Uploads are restricted by type and size", async () => {
  const fake = new FormData();
  fake.append("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "x.png");
  assert.equal((await req("/api/admin/upload", { method: "POST", body: fake })).status, 415, "fake PNG rejected");
  const svg = new FormData();
  svg.append("file", new Blob(["<svg/>"], { type: "image/svg+xml" }), "x.svg");
  assert.equal((await req("/api/admin/upload", { method: "POST", body: svg })).status, 415, "SVG rejected");
  const big = new FormData();
  big.append("file", new Blob([PNG, Buffer.alloc(5.5 * 1024 * 1024)], { type: "image/png" }), "big.png");
  assert.equal((await req("/api/admin/upload", { method: "POST", body: big })).status, 413, "oversized file rejected");
  const ok = new FormData();
  ok.append("file", new Blob([PNG], { type: "image/png" }), "ok.png");
  ok.append("folder", "products");
  const r = await req("/api/admin/upload", { method: "POST", body: ok });
  assert.equal(r.status, 201, r.text);
  imageUrl = r.json.url;
  const img = await fetch(BASE + imageUrl.replace(BASE, ""));
  assert.equal(img.status, 200, "uploaded photo is served");
});

await step("Owner creates a category", async () => {
  const r = await req("/api/admin/categories", { method: "POST", body: { name: { ru: "Тест E2E", en: "E2E Test" }, slug: `e2e-${stamp}`, visible: true } });
  assert.equal(r.status, 201, r.text);
  categoryId = r.json.category.id;
});

const productBody = (patch = {}) => ({
  slug, status: "published", categoryId, name: { ru: `E2E Платье ${stamp}`, en: `E2E Dress ${stamp}` },
  description: { ru: "Тест", en: "Test" }, price: 12300, compareAtPrice: null,
  colors: [{ id: ids.black, name: { ru: "Чёрный", en: "Black" }, hex: "#000000" }, { id: ids.white, name: { ru: "Белый", en: "White" }, hex: "#ffffff" }],
  sizes: [{ id: ids.s, label: "S" }, { id: ids.m, label: "M" }],
  variants: [],
  images: [{ id: uid(), url: imageUrl, path: null, colorId: ids.black }],
  sizeChart: "Размер | Грудь\nS | 86\nM | 90", isNew: true, isFeatured: false, ...patch,
});

await step("Server validation rejects invalid prices", async () => {
  slug = `e2e-dress-${stamp}`;
  const r = await req("/api/admin/products", { method: "POST", body: productBody({ compareAtPrice: 100 }) });
  assert.equal(r.status, 422);
  assert.match(r.json.error, /Старая цена/);
  const neg = await req("/api/admin/products", { method: "POST", body: productBody({ price: -1 }) });
  assert.equal(neg.status, 422);
});

let variants;
await step("Owner adds a product with photos and variants", async () => {
  const r = await req("/api/admin/products", { method: "POST", body: productBody() });
  assert.equal(r.status, 201, r.text);
  productId = r.json.product.id;
  variants = r.json.product.variants;
  assert.equal(variants.length, 4, "2 colors × 2 sizes = 4 variants created");
  // Set stock: black S = 3, black M = 0, white S = 0, white M = 1
  const stock = { [`${ids.black}${ids.s}`]: 3, [`${ids.black}${ids.m}`]: 0, [`${ids.white}${ids.s}`]: 0, [`${ids.white}${ids.m}`]: 1 };
  variants = variants.map((v) => ({ ...v, stock: stock[v.colorId + v.sizeId] }));
  const u = await req(`/api/admin/products/${productId}`, { method: "PUT", body: productBody({ variants }) });
  assert.equal(u.status, 200, u.text);
  assert.deepEqual(u.json.product.variants.map((v) => v.id), variants.map((v) => v.id), "variant ids stay stable");
  const html = (await page(`/product/${slug}`)).text;
  assert.match(html, new RegExp(`E2E Dress ${stamp}`));
  assert.match(html, /\$123/);
  assert.ok((await page("/catalog")).text.includes(`E2E Dress ${stamp}`), "visible in catalog");
});

await step("Owner changes the price and customers see it", async () => {
  const r = await req(`/api/admin/products/${productId}`, { method: "PUT", body: productBody({ variants, price: 9900, compareAtPrice: 12300 }) });
  assert.equal(r.status, 200, r.text);
  const html = (await page(`/product/${slug}`)).text;
  assert.match(html, /\$99/);
  assert.match(html, /Sale/);
  assert.ok((await page("/catalog")).text.includes("$99"));
});

await step("Cart: prices come from the server and unavailable variants are flagged", async () => {
  const find = (c, s) => variants.find((v) => v.colorId === c && v.sizeId === s).id;
  const r = await req("/api/cart", { method: "POST", auth: false, body: { items: [
    { productId, variantId: find(ids.black, ids.s), qty: 5 },
    { productId, variantId: find(ids.black, ids.m), qty: 1 },
    { productId, variantId: uid(), qty: 1 },
  ] } });
  assert.equal(r.status, 200, r.text);
  const [a, b] = r.json.lines;
  assert.equal(r.json.lines.length, 2, "unknown variant dropped");
  assert.equal(a.available, true);
  assert.equal(a.qty, 3, "quantity limited to stock");
  assert.equal(a.unitPrice, 9900, "current price used");
  assert.equal(b.available, false, "stock 0 variant cannot be ordered");
  const tamper = await req("/api/cart", { method: "POST", auth: false, body: { items: [{ productId, variantId: "x", qty: -3 }] } });
  assert.equal(tamper.status, 422, "invalid cart input rejected");
});

await step("Hiding a product removes it from the public catalog", async () => {
  const r = await req(`/api/admin/products/${productId}`, { method: "PATCH", body: { status: "hidden" } });
  assert.equal(r.status, 200, r.text);
  assert.equal((await page(`/product/${slug}`)).status, 404);
  assert.ok(!(await page("/catalog")).text.includes(`E2E Dress ${stamp}`));
  assert.ok(!(await page("/sitemap.xml")).text.includes(slug));
  const cart = await req("/api/cart", { method: "POST", auth: false, body: { items: [{ productId, variantId: variants[0].id, qty: 1 }] } });
  assert.equal(cart.json.lines.length, 0, "hidden product cannot be ordered");
  const draft = await req(`/api/admin/products/${productId}`, { method: "PATCH", body: { status: "draft" } });
  assert.equal(draft.status, 200);
  assert.equal((await page(`/product/${slug}`)).status, 404, "drafts are not public");
});

await step("Hiding a category hides its products", async () => {
  await req(`/api/admin/products/${productId}`, { method: "PATCH", body: { status: "published" } });
  assert.equal((await page(`/product/${slug}`)).status, 200);
  const r = await req(`/api/admin/categories/${categoryId}`, { method: "PUT", body: { name: { ru: "Тест E2E", en: "E2E Test" }, slug: `e2e-${stamp}`, visible: false } });
  assert.equal(r.status, 200, r.text);
  assert.equal((await page(`/product/${slug}`)).status, 404);
});

await step("Export works for the owner", async () => {
  const json = await req("/api/admin/export?format=json");
  assert.equal(json.status, 200);
  assert.ok(json.json.products.some((p) => p.id === productId));
  const csv = await req("/api/admin/export?format=csv");
  assert.equal(csv.status, 200);
  assert.ok(csv.text.includes(productId));
});

await step("Cleanup: owner deletes the test product and category", async () => {
  assert.equal((await req(`/api/admin/products/${productId}`, { method: "DELETE" })).status, 200);
  assert.equal((await req(`/api/admin/categories/${categoryId}`, { method: "DELETE" })).status, 200);
  assert.equal((await req(`/api/admin/products/${productId}`, { method: "DELETE" })).status, 404);
});

await step("Readable URLs, 404 page and metadata", async () => {
  const home = await page("/");
  assert.match(home.text, /<title>[^<]+<\/title>/);
  assert.match(home.text, /property="og:title"/);
  const nf = await page("/this-page-does-not-exist");
  assert.equal(nf.status, 404);
  const prod = await page("/product/demo-amira-dress");
  if (prod.status === 200) {
    assert.match(prod.text, /<title>[^<]*Amira[^<]*<\/title>/);
    assert.match(prod.text, /application\/ld\+json/);
  }
});

const failed = results.filter((r) => r[0] === "✗").length;
console.log(`\n${results.length - failed}/${results.length} scenarios passed`);
