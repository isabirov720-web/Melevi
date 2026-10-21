import { adminHandler, json, refreshStorefront } from "@/lib/api";
import { settingsInput } from "@/lib/schema";

export const PUT = adminHandler(async (req, { repo }) => {
  const prev = await repo.getSettings();
  const next = settingsInput.parse(await req.json());
  const saved = await repo.saveSettings(next);
  const stale = [prev.logoPath, prev.heroImagePath].filter(
    (p): p is string => !!p && p !== saved.logoPath && p !== saved.heroImagePath,
  );
  await repo.deleteFiles(stale);
  refreshStorefront();
  return json({ ok: true, settings: saved });
});
