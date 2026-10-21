import Link from "next/link";
import { tr } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import type { Locale, StoreSettings } from "@/lib/types";
import { instagramLinks } from "@/lib/order";

export function contactItems(s: StoreSettings, locale: Locale) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const c = s.contacts;
  const wa = c.whatsapp.replace(/\D/g, "");
  const ig = instagramLinks(c.instagramUrl);
  const place = [tr(c.address, locale), tr(c.city, locale)].filter(Boolean).join(", ");
  return [
    wa.length >= 7 && { label: t("contact.whatsapp"), value: c.whatsapp, href: `https://wa.me/${wa}` },
    c.phone && { label: t("contact.phone"), value: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` },
    c.email && { label: t("contact.email"), value: c.email, href: `mailto:${c.email}` },
    ig && { label: t("contact.instagram"), value: `@${ig.username}`, href: ig.profile },
    c.telegramUrl && { label: t("contact.telegram"), value: c.telegramUrl.replace(/^https:\/\/(www\.)?/, ""), href: c.telegramUrl },
    c.threadsUrl && { label: t("contact.threads"), value: c.threadsUrl.replace(/^https:\/\/(www\.)?/, ""), href: c.threadsUrl },
    place && { label: t("contact.address"), value: place, href: null },
  ].filter(Boolean) as { label: string; value: string; href: string | null }[];
}

export function policyItems(s: StoreSettings, locale: Locale) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  return [
    { key: "delivery", title: t("product.delivery"), text: tr(s.policies.delivery, locale) },
    { key: "exchange", title: t("product.exchange"), text: tr(s.policies.exchange, locale) },
    { key: "returns", title: t("product.returns"), text: tr(s.policies.returns, locale) },
  ].filter((p) => p.text);
}

export function Footer({ settings, locale }: { settings: StoreSettings; locale: Locale }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const contacts = contactItems(settings, locale);
  const policies = policyItems(settings, locale);
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" className="logo-text footer-logo">{settings.storeName}</Link>
          {tr(settings.heroSubtitle, locale) && <p className="muted-inv">{tr(settings.heroSubtitle, locale)}</p>}
        </div>
        {contacts.length > 0 && (
          <div>
            <h2 className="footer-title">{t("footer.contacts")}</h2>
            <ul className="footer-list">
              {contacts.map((c) => (
                <li key={c.label}>
                  <span className="footer-label">{c.label}</span>
                  {c.href ? <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{c.value}</a> : <span>{c.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h2 className="footer-title">{t("footer.info")}</h2>
          {policies.length ? (
            policies.map((p) => (
              <details key={p.key} className="footer-policy">
                <summary>{p.title}</summary>
                <p>{p.text}</p>
              </details>
            ))
          ) : (
            <p className="muted-inv">{t("footer.policyFallback")}</p>
          )}
          <p className="footer-links"><Link href="/about">{t("nav.about")}</Link> · <Link href="/catalog">{t("nav.catalog")}</Link></p>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} {settings.storeName}. {t("footer.rights")}
      </div>
    </footer>
  );
}
