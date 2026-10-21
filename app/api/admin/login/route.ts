import type { NextRequest } from "next/server";
import { login, loginThrottled, recordLoginFailure } from "@/lib/auth";
import { errorResponse, fail, json } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (loginThrottled(ip)) return fail("Слишком много попыток. Подождите 15 минут.", 429);
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
    const result = await login(email, password);
    if (!result.ok) {
      recordLoginFailure(ip);
      return fail(result.error, 401);
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
