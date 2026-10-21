import Link from "next/link";
import { tr } from "@/lib/catalog";
import type { Category, Locale, StoreSettings } from "@/lib/types";
import { translate } from "@/lib/i18n";
import { Logo } from "./Logo";
import { CartLink, LangSwitch, MobileMenu } from "./HeaderClient";

export function Header({ settings, categories, locale }: { settings: StoreSettings; categories: Category[]; locale: Locale }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="header-left">
          <MobileMenu categories={categories.map((c) => ({ slug: c.slug, name: tr(c.name, locale) }))} />
          <nav className="nav-desktop" aria-label="Main">
            <Link href="/catalog">{t("nav.catalog")}</Link>
            <Link href="/about">{t("nav.about")}</Link>
            <Link href="/about#contacts">{t("nav.contacts")}</Link>
          </nav>
        </div>
        <Logo name={settings.storeName} url={settings.logoUrl} />
        <div className="header-right">
          <LangSwitch locales={settings.enabledLocales} />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
