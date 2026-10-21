// Loads the labeled demo catalog (data/demo.json) into Supabase so the site isn't empty on day one.
// Optional — skip it if you want to start with an empty catalog.
//
// Usage (run on YOUR computer only; the service key must never be put in Vercel or the browser):
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run seed:supabase
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const demo = JSON.parse(readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));

const categories = demo.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, position: c.position, visible: c.visible, is_demo: true }));
const products = demo.products.map((p) => ({
  id: p.id, slug: p.slug, status: p.status, category_id: p.categoryId, name: p.name, description: p.description,
  price: p.price, compare_at_price: p.compareAtPrice, colors: p.colors, sizes: p.sizes, variants: p.variants,
  images: p.images, size_chart: p.sizeChart, is_new: p.isNew, is_featured: p.isFeatured, is_demo: true, created_at: p.createdAt,
}));

let r = await db.from("categories").upsert(categories);
if (r.error) throw r.error;
r = await db.from("products").upsert(products);
if (r.error) throw r.error;
console.log(`Demo data loaded: ${categories.length} categories, ${products.length} products (all labeled "Демо").`);
console.log("Remove them later in the admin panel: Копия → Удалить демо-данные.");
