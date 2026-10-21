// Returns current prices and availability for the items in a customer's cart.
import type { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, json } from "@/lib/api";
import { getPublicRepo } from "@/lib/repo";
import { variantPrice } from "@/lib/catalog";
import type { ResolvedCartLine } from "@/lib/types";

const input = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid(), qty: z.number().int().min(1).max(999) }))
    .max(50),
});

export async function POST(req: NextRequest) {
  try {
    const { items } = input.parse(await req.json());
    const repo = getPublicRepo();
    const products = new Map((await repo.listProducts()).map((p) => [p.id, p]));
    const lines: ResolvedCartLine[] = [];
    for (const item of items) {
      const p = products.get(item.productId);
      const v = p?.variants.find((x) => x.id === item.variantId);
      if (!p || !v) continue; // product hidden/deleted or variant removed: drop from cart
      const color = p.colors.find((c) => c.id === v.colorId) ?? null;
      const img = p.images.find((i) => i.colorId && i.colorId === v.colorId) ?? p.images[0];
      lines.push({
        productId: p.id,
        variantId: v.id,
        qty: Math.min(item.qty, Math.max(v.stock, 0)) || item.qty,
        slug: p.slug,
        name: p.name,
        image: img?.url ?? null,
        color: color?.name ?? null,
        size: p.sizes.find((s) => s.id === v.sizeId)?.label ?? null,
        unitPrice: variantPrice(p, v),
        stock: v.stock,
        available: v.stock > 0,
      });
    }
    return json({ ok: true, lines });
  } catch (e) {
    return errorResponse(e);
  }
}
