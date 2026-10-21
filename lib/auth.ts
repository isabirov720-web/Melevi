// Owner authentication and authorization.
//  • Supabase mode: Supabase Auth (email + password) + membership in the `admins` table.
//  • Local mode: ADMIN_PASSWORD from the server environment + a signed, HTTP-only cookie.
import "server-only";
import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendMode } from "./repo";
import { createLocalRepo, DATA_DIR } from "./repo/local";
import { createSupabaseRepo } from "./repo/supabase";
import type { AdminRepo } from "./repo/types";
import { supabaseWithSession } from "./supabase/clients";

const COOKIE = "melevi_admin";
const SESSION_DAYS = 7;

export interface AdminSession {
  repo: AdminRepo;
  email: string | null;
}

async function sessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, "session-secret");
  try {
    return (await fs.readFile(file, "utf8")).trim();
  } catch {
    const secret = randomBytes(32).toString("hex");
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(file, secret, { mode: 0o600 });
    return secret;
  }
}

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function localSessionValid(value: string | undefined) {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(await sessionSecret(), `admin.${exp}`));
}

/** Returns the owner session, or null for everyone else. */
export async function getAdmin(): Promise<AdminSession | null> {
  if (backendMode() === "local") {
    const store = await cookies();
    if (!(await localSessionValid(store.get(COOKIE)?.value))) return null;
    return { repo: createLocalRepo(true), email: null };
  }
  const db = await supabaseWithSession();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: row } = await db.from("admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (!row) return null;
  return { repo: createSupabaseRepo(db, true), email: auth.user.email ?? null };
}

/** For admin pages: redirects to the login page when not signed in as the owner. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

// Simple in-memory throttle against password guessing (per server instance).
const attempts = new Map<string, { count: number; until: number }>();
export function loginThrottled(key: string) {
  const a = attempts.get(key);
  return !!a && a.count >= 8 && a.until > Date.now();
}
export function recordLoginFailure(key: string) {
  const a = attempts.get(key);
  const fresh = !a || a.until < Date.now();
  attempts.set(key, { count: fresh ? 1 : a!.count + 1, until: Date.now() + 15 * 60_000 });
}

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (backendMode() === "local") {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || expected.length < 8)
      return { ok: false, error: "Пароль администратора не настроен: задайте ADMIN_PASSWORD (минимум 8 символов) в файле .env.local." };
    if (!safeEqual(password, expected)) return { ok: false, error: "Неверный пароль" };
    const exp = String(Date.now() + SESSION_DAYS * 86_400_000);
    (await cookies()).set(COOKIE, `${exp}.${sign(await sessionSecret(), `admin.${exp}`)}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    });
    return { ok: true };
  }
  const db = await supabaseWithSession();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: "Неверный email или пароль" };
  const { data: row } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) {
    await db.auth.signOut();
    return { ok: false, error: "У этого аккаунта нет прав владельца магазина. Добавьте его в таблицу admins (см. инструкцию)." };
  }
  return { ok: true };
}

export async function logout() {
  if (backendMode() === "local") {
    (await cookies()).delete(COOKIE);
    return;
  }
  const db = await supabaseWithSession();
  await db.auth.signOut();
}
