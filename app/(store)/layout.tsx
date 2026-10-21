import type { ReactNode } from "react";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { StoreProvider } from "@/components/store/StoreProvider";
import { getCategories, getLocale, getSettings, safeHex, siteUrl } from "@/lib/store-server";
import { translate } from "@/lib/i18n";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [settings, categories, locale] = await Promise.all([getSettings(), getCategories(), getLocale()]);
  const { primary, accent, background } = settings.colors;
  const theme = `:root{--ink:${safeHex(primary, "#151413")};--accent:${safeHex(accent, "#8a6f52")};--bg:${safeHex(background, "#faf8f4")}}`;
  return (
    <StoreProvider
      info={{
        locale,
        currency: settings.currency,
        storeName: settings.storeName,
        whatsapp: settings.contacts.whatsapp,
        instagramUrl: settings.contacts.instagramUrl,
        orderChannels: settings.orderChannels,
        deliveryChargedSeparately: settings.policies.deliveryChargedSeparately,
        siteUrl: siteUrl(),
      }}
    >
      <style>{theme}</style>
      <a href="#main" className="skip-link">{translate(locale, "skip")}</a>
      <Header settings={settings} categories={categories} locale={locale} />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer settings={settings} locale={locale} />
    </StoreProvider>
  );
}
