import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getAdmin, type AdminSession } from "./auth";
import { RepoError } from "./repo/types";
import { firstError } from "./schema";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (error: string, status = 400) => json({ ok: false, error }, status);

/** Blocks cross-site form posts: mutations must come from this site's own pages. */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

/** Wraps an owner-only API handler: checks origin + owner session, maps errors to clear messages. */
export function adminHandler<C>(handler: (req: NextRequest, admin: AdminSession, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      if (req.method !== "GET" && !sameOrigin(req)) return fail("Запрос отклонён (другой источник)", 403);
      const admin = await getAdmin();
      if (!admin) return fail("Требуется вход владельца магазина", 401);
      return await handler(req, admin, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof ZodError) return fail(firstError(e), 422);
  if (e instanceof RepoError) return fail(e.message, e.status);
  if (e instanceof SyntaxError) return fail("Некорректный запрос", 400);
  console.error(e);
  return fail("Не удалось сохранить: внутренняя ошибка сервера. Попробуйте ещё раз.", 500);
}

/** Makes owner changes visible to customers immediately. */
export function refreshStorefront() {
  revalidatePath("/", "layout");
}
