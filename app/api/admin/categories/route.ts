import { randomUUID } from "node:crypto";
import { adminHandler, json, refreshStorefront } from "@/lib/api";
import { categoryInput, reorderInput, toCategory } from "@/lib/schema";

export const POST = adminHandler(async (req, { repo }) => {
  const input = categoryInput.parse(await req.json());
  const count = (await repo.listCategories()).length;
  const saved = await repo.saveCategory(toCategory({ ...input, id: undefined }, null, count, randomUUID));
  refreshStorefront();
  return json({ ok: true, category: saved }, 201);
});

/** Saves a new display order: body { ids: [...] } */
export const PUT = adminHandler(async (req, { repo }) => {
  const { ids } = reorderInput.parse(await req.json());
  await repo.reorderCategories(ids);
  refreshStorefront();
  return json({ ok: true });
});
