// Helpers for admin client components.

/** UUID that also works on plain-http LAN addresses (where crypto.randomUUID is unavailable). */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && window.isSecureContext) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function api<T = object>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 401) return { ok: false, error: "Сессия истекла. Войдите снова (данные на странице не потеряны — откройте вход в новой вкладке)." };
    if (!res.ok || !data?.ok) return { ok: false, error: data?.error ?? `Ошибка сервера (${res.status}). Попробуйте ещё раз.` };
    return data;
  } catch {
    return { ok: false, error: "Нет соединения с сервером. Проверьте интернет и попробуйте снова." };
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Resizes and compresses a photo in the browser before upload (phone photos are often 5–12 MB). */
export async function compressImage(file: File, { maxSide = 2000, keepAlpha = false } = {}): Promise<Blob> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) throw new Error(`«${file.name}» — это не изображение`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Не удалось открыть «${file.name}». Сохраните фото в формате JPG или PNG и попробуйте снова.`);
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.86, 0.75, 0.6]) {
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, keepAlpha ? "image/png" : "image/jpeg", quality);
    if (blob && blob.size <= 4.5 * 1024 * 1024) return blob;
  }
  throw new Error(`Фото «${file.name}» слишком большое даже после сжатия`);
}

export async function uploadImage(file: File, folder: "products" | "site", opts?: { maxSide?: number; keepAlpha?: boolean }) {
  const blob = await compressImage(file, opts);
  const ext = blob.type.split("/")[1];
  const fd = new FormData();
  fd.append("file", new File([blob], `photo.${ext}`, { type: blob.type }));
  fd.append("folder", folder);
  const res = await api<{ url: string; path: string }>("/api/admin/upload", "POST", fd);
  if (!res.ok) throw new Error(res.error);
  return { url: res.url, path: res.path };
}
