import { adminHandler, json, refreshStorefront } from "@/lib/api";

/** Removes every record marked as demo data. */
export const DELETE = adminHandler(async (_req, { repo }) => {
  const removed = await repo.deleteDemoData();
  refreshStorefront();
  return json({ ok: true, removed });
});
