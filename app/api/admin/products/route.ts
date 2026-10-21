import { randomUUID } from "node:crypto";
import { adminHandler, json, refreshStorefront } from "@/lib/api";
import { productInput, toProduct } from "@/lib/schema";

export const POST = adminHandler(async (req, { repo }) => {
  const input = productInput.parse(await req.json());
  const saved = await repo.saveProduct(toProduct({ ...input, id: undefined }, null, randomUUID));
  refreshStorefront();
  return json({ ok: true, product: saved }, 201);
});
