import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getPublicRepo } from "./repo";
import { translate, type DictKey } from "./i18n";
import type { Locale } from "./types";

// Per-request memoized reads for customer pages.
export const getSettings = cache(() => getPublicRepo().getSettings());
export const getCategories = cache(() => getPublicRepo().listCategories());
export const getProducts = cache(() => getPublicRepo().listProducts());
export const getProductBySlug = cache((slug: string) => getPublicRepo().getProductBySlug(slug));

export const getLocale = cache(async (): Promise<Locale> => {
  const settings = await getSettings();
  const chosen = (await cookies()).get("lang")?.value as Locale | undefined;
  return chosen && settings.enabledLocales.includes(chosen) ? chosen : settings.defaultLocale;
});

export async function getT() {
  const locale = await getLocale();
  return { locale, t: (key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars) };
}

export function siteUrl() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export const safeHex = (v: string, fallback: string) => (HEX.test(v) ? v : fallback);
