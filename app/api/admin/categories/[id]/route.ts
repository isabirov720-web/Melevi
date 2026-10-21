import { randomUUID } from "node:crypto";
import { adminHandler, fail, json, refreshStorefront } from "@/lib/api";
import { categoryInput, toCategory } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = adminHandler<Ctx>(async (req, { repo }, { params }) => {
  const { id } = await params;
  const prev = (await repo.listCategories()).find((c) => c.id === id);
  if (!prev) return fail("Категория не найдена", 404);
  const input = categoryInput.parse(await req.json());
  const saved = await repo.saveCategory(toCategory(input, prev, prev.position, randomUUID));
  refreshStorefront();
  return json({ ok: true, category: saved });
});

export const DELETE = adminHandler<Ctx>(async (_req, { repo }, { params }) => {
  const { id } = await params;
  await repo.deleteCategory(id);
  refreshStorefront();
  return json({ ok: true });
});
