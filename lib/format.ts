import type { Locale } from "./types";

export const CURRENCIES = [
  { code: "USD", label: "USD — доллар США ($)" },
  { code: "KGS", label: "KGS — киргизский сом" },
  { code: "RUB", label: "RUB — российский рубль (₽)" },
  { code: "KZT", label: "KZT — казахстанский тенге (₸)" },
  { code: "EUR", label: "EUR — евро (€)" },
  { code: "UZS", label: "UZS — узбекский сум" },
] as const;

/** Formats minor units (cents) as a price, hiding ".00" for whole amounts. */
export function formatMoney(minor: number, currency: string, locale: Locale) {
  const whole = minor % 100 === 0;
  try {
    return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(whole ? 0 : 2)} ${currency}`;
  }
}

/** Parses an owner-typed price like "120", "120.5" or "1 200,50" into minor units. Returns null if invalid. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[\s ]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function moneyToInput(minor: number | null | undefined) {
  if (minor == null) return "";
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
