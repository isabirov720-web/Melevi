// Serves photos uploaded in local mode. In Supabase mode photos come from Supabase Storage.
import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/repo/local";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const full = path.resolve(UPLOAD_DIR, ...parts);
  const type = TYPES[path.extname(full).slice(1)];
  if (!full.startsWith(UPLOAD_DIR + path.sep) || !type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
