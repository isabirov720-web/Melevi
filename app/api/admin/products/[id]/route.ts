import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminHandler, fail, json, refreshStorefront } from "@/lib/api";
import { productInput, toProduct } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = adminHandler<Ctx>(async (req, { repo }, { params }) => {
  const { id } = await params;
  const prev = await repo.getProductById(id);
  if (!prev) return fail("Товар не найден — возможно, он уже удалён", 404);
  const input = productInput.parse(await req.json());
  const saved = await repo.saveProduct(toProduct(input, prev, randomUUID));
  // Remove photos that were deleted from this product.
  const kept = new Set(saved.images.map((i) => i.path));
  await repo.deleteFiles(prev.images.map((i) => i.path).filter((p): p is string => !!p && !kept.has(p)));
  refreshStorefront();
  return json({ ok: true, product: saved });
});

const quickInput = z.object({
  status: z.enum(["draft", "published", "hidden"]).optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
});

/** Quick toggles from the product list (hide/publish, featured, new). */
export const PATCH = adminHandler<Ctx>(async (req, { repo }, { params }) => {
  const { id } = await params;
  const prev = await repo.getProductById(id);
  if (!prev) return fail("Товар не найден", 404);
  const patch = quickInput.parse(await req.json());
  if (patch.status === "published" && prev.images.length === 0)
    return fail("Чтобы опубликовать товар, добавьте хотя бы одно фото", 422);
  const saved = await repo.saveProduct({ ...prev, ...patch, updatedAt: new Date().toISOString() });
  refreshStorefront();
  return json({ ok: true, product: saved });
});

export const DELETE = adminHandler<Ctx>(async (_req, { repo }, { params }) => {
  const { id } = await params;
  const prev = await repo.getProductById(id);
  if (!prev) return fail("Товар не найден", 404);
  await repo.deleteProduct(id);
  await repo.deleteFiles(prev.images.map((i) => i.path).filter((p): p is string => !!p));
  refreshStorefront();
  return json({ ok: true });
});
