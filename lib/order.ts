// Builds the order-request message the customer sends to the store themselves.
import { tr } from "./catalog";
import { formatMoney } from "./format";
import { translate } from "./i18n";
import type { Locale, ResolvedCartLine } from "./types";

export function orderableLines(lines: ResolvedCartLine[]) {
  return lines.filter((l) => l.available && l.qty > 0);
}

export function cartTotal(lines: ResolvedCartLine[]) {
  return orderableLines(lines).reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

export function buildOrderText(opts: {
  lines: ResolvedCartLine[];
  locale: Locale;
  currency: string;
  storeName: string;
  siteUrl: string;
  deliveryChargedSeparately: boolean;
  comment?: string;
}) {
  const { locale, currency } = opts;
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v);
  const money = (n: number) => formatMoney(n, currency, locale);
  const lines = orderableLines(opts.lines);
  const out: string[] = [t("order.hello", { store: opts.storeName }), ""];
  lines.forEach((l, i) => {
    const opts2: string[] = [];
    if (l.color) opts2.push(`${t("order.color")}: ${tr(l.color, locale)}`);
    if (l.size) opts2.push(`${t("order.size")}: ${l.size}`);
    out.push(`${i + 1}. ${tr(l.name, locale)}${opts2.length ? ` (${opts2.join(", ")})` : ""}`);
    out.push(`   ${l.qty} × ${money(l.unitPrice)} = ${money(l.unitPrice * l.qty)}`);
    out.push(`   ${opts.siteUrl.replace(/\/$/, "")}/product/${l.slug}`);
  });
  out.push("", `${t("order.total")}: ${money(cartTotal(lines))}`);
  out.push(opts.deliveryChargedSeparately ? t("order.deliveryExtra") : t("order.confirm"));
  const comment = opts.comment?.trim();
  if (comment) out.push("", `${t("order.comment")}: ${comment.slice(0, 500)}`);
  return out.join("\n");
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Direct-message link for an Instagram profile URL, falling back to the profile itself. */
export function instagramLinks(profileUrl: string) {
  const m = profileUrl.match(/instagram\.com\/([A-Za-z0-9._]+)/);
  if (!m) return null;
  return { profile: `https://www.instagram.com/${m[1]}/`, dm: `https://ig.me/m/${m[1]}`, username: m[1] };
}
