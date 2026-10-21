"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { BagIcon, CloseIcon, MenuIcon } from "./Icons";
import type { Locale } from "@/lib/types";

export function CartLink() {
  const { cartCount, cartReady, t } = useStore();
  return (
    <Link href="/cart" className="icon-btn cart-link" aria-label={`${t("nav.cart")}${cartReady && cartCount ? ` (${cartCount})` : ""}`}>
      <BagIcon />
      {cartReady && cartCount > 0 && <span className="cart-count" aria-hidden>{cartCount}</span>}
    </Link>
  );
}

export function LangSwitch({ locales }: { locales: Locale[] }) {
  const { locale, t } = useStore();
  const router = useRouter();
  if (locales.length < 2) return null;
  const choose = (l: Locale) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.label")}>
      {locales.map((l) => (
        <button key={l} type="button" onClick={() => choose(l)} aria-pressed={l === locale} className={l === locale ? "active" : ""}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function MobileMenu({ categories }: { categories: { slug: string; name: string }[] }) {
  const { t } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="icon-btn menu-btn" aria-label={t("nav.menu")} aria-expanded={open} onClick={() => setOpen(true)}>
        <MenuIcon />
      </button>
      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={() => setOpen(false)} aria-hidden />
      <nav className={`drawer drawer-left ${open ? "open" : ""}`} aria-label={t("nav.menu")} aria-hidden={!open} inert={!open}>
        <div className="drawer-head">
          <span className="eyebrow">{t("nav.menu")}</span>
          <button ref={closeRef} type="button" className="icon-btn" aria-label={t("nav.close")} onClick={() => setOpen(false)}>
            <CloseIcon />
          </button>
        </div>
        <ul className="drawer-nav">
          <li><Link href="/">{t("nav.home")}</Link></li>
          <li><Link href="/catalog">{t("nav.catalog")}</Link></li>
          {categories.map((c) => (
            <li key={c.slug} className="sub"><Link href={`/catalog?category=${c.slug}`}>{c.name}</Link></li>
          ))}
          <li><Link href="/about">{t("nav.about")}</Link></li>
          <li><Link href="/about#contacts">{t("nav.contacts")}</Link></li>
          <li><Link href="/cart">{t("nav.cart")}</Link></li>
        </ul>
      </nav>
    </>
  );
}
