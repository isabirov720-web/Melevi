import { adminHandler, fail, json } from "@/lib/api";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", magic: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  "image/avif": { ext: "avif", magic: (b) => b.toString("ascii", 4, 12).startsWith("ftypavi") },
};
const FOLDERS = new Set(["products", "site"]);

/** Accepts one photo (multipart field "file"), checks type by content and size, stores it. */
export const POST = adminHandler(async (req, { repo }) => {
  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "products");
  if (!FOLDERS.has(folder)) return fail("Неизвестная папка для загрузки");
  if (!(file instanceof File)) return fail("Файл не получен");
  if (file.size > MAX_BYTES) return fail("Файл слишком большой: максимум 5 МБ", 413);
  const type = TYPES[file.type];
  if (!type) return fail("Можно загружать только JPG, PNG, WebP или AVIF", 415);
  const data = Buffer.from(await file.arrayBuffer());
  if (!type.magic(data)) return fail("Файл повреждён или не является изображением", 415);
  const saved = await repo.uploadFile(data, file.type, type.ext, folder);
  return json({ ok: true, ...saved }, 201);
});
