import "server-only";
import { isSupabaseConfigured, supabasePublic } from "../supabase/clients";
import { createLocalRepo } from "./local";
import { createSupabaseRepo } from "./supabase";
import { RepoError, type ReadRepo } from "./types";

export function backendMode(): "local" | "supabase" {
  if (isSupabaseConfigured()) return "supabase";
  if (process.env.VERCEL)
    throw new RepoError(
      "База данных не подключена: задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в настройках хостинга.",
      500,
    );
  return "local";
}

/** Read-only repository for customers: published products and visible categories only. */
export function getPublicRepo(): ReadRepo {
  return backendMode() === "supabase" ? createSupabaseRepo(supabasePublic(), false) : createLocalRepo(false);
}
