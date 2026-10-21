import { adminHandler, fail } from "@/lib/api";
import { tr } from "@/lib/catalog";

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  // Prevent spreadsheet formula injection and quote every cell.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replaceAll('"', '""')}"`;
};

/** Backup download: ?format=json (full, restorable) or ?format=csv (one row per variant, for Excel). */
export const GET = adminHandler(async (req, { repo }) => {
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const [settings, categories, products] = await Promise.all([repo.getSettings(), repo.listCategories(), repo.listProducts()]);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, settings, categories, products }, null, 2);
    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="melevi-backup-${stamp}.json"`,
      },
    });
  }
  if (format !== "csv") return fail("Неизвестный формат");
  const catName = new Map(categories.map((c) => [c.id, tr(c.name, "ru")]));
  const header = ["product_id", "variant_id", "slug", "status", "name_ru", "name_en", "category", "price", "compare_at_price", "variant_price", "color", "size", "stock", "is_new", "is_featured", "is_demo", "main_image", "updated_at"];
  const rows = products.flatMap((p) =>
    p.variants.map((v) => [
      p.id, v.id, p.slug, p.status, p.name.ru, p.name.en, catName.get(p.categoryId ?? "") ?? "",
      (p.price / 100).toFixed(2), p.compareAtPrice != null ? (p.compareAtPrice / 100).toFixed(2) : "",
      v.price != null ? (v.price / 100).toFixed(2) : "",
      tr(p.colors.find((c) => c.id === v.colorId)?.name, "ru"), p.sizes.find((s) => s.id === v.sizeId)?.label ?? "",
      v.stock, p.isNew, p.isFeatured, p.isDemo, p.images[0]?.url ?? "", p.updatedAt,
    ]),
  );
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="melevi-catalog-${stamp}.csv"`,
    },
  });
});
