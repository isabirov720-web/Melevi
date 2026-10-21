import type { StoreSettings } from "./types";

const empty = { ru: "", en: "" };

/**
 * Starting settings. Only facts visible on the public Instagram profile are filled in
 * (brand name, Bishkek, "luxury modest wear / faith & design", worldwide shipping).
 * Everything else is left empty for the owner to fill in the admin panel.
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "MELEVI",
  logoUrl: null,
  logoPath: null,
  heroImageUrl: "/demo/hero.svg",
  heroImagePath: null,
  heroHeadline: { ru: "Modest wear. Вера и дизайн.", en: "Modest wear. Faith & design." },
  heroSubtitle: {
    ru: "Luxury modest wear из Бишкека.",
    en: "Luxury modest wear from Bishkek.",
  },
  aboutTitle: { ru: "О MELEVI", en: "About MELEVI" },
  aboutText: {
    ru: "MELEVI — бренд luxury modest wear из Бишкека, где вера встречается с дизайном.\n\n[Заполните этот текст в админ-панели: история бренда, ткани, подход к пошиву.]",
    en: "MELEVI is a luxury modest wear brand from Bishkek, where faith meets design.\n\n[Edit this text in the admin panel: brand story, fabrics, craftsmanship.]",
  },
  contacts: {
    whatsapp: "",
    phone: "",
    email: "",
    city: { ru: "Бишкек", en: "Bishkek" },
    address: empty,
    instagramUrl: "https://www.instagram.com/melevi.official/",
    telegramUrl: "",
    threadsUrl: "",
  },
  policies: {
    delivery: {
      ru: "Доставка по всему миру. Стоимость и сроки магазин подтверждает после получения заявки.",
      en: "We ship worldwide. The store confirms cost and timing after receiving your order request.",
    },
    exchange: empty,
    returns: empty,
    deliveryChargedSeparately: true,
  },
  orderChannels: { whatsapp: true, instagram: true },
  currency: "USD",
  defaultLocale: "ru",
  enabledLocales: ["ru", "en"],
  colors: { primary: "#151413", accent: "#8a6f52", background: "#faf8f4" },
  sections: { categories: true, newArrivals: true, featured: true, about: true, instagram: true },
};

/** Fills in fields added in newer versions so older saved settings keep working. */
export function withDefaults(s: Partial<StoreSettings> | null | undefined): StoreSettings {
  const d = DEFAULT_SETTINGS;
  if (!s) return structuredClone(d);
  return {
    ...d,
    ...s,
    contacts: { ...d.contacts, ...s.contacts },
    policies: { ...d.policies, ...s.policies },
    orderChannels: { ...d.orderChannels, ...s.orderChannels },
    colors: { ...d.colors, ...s.colors },
    sections: { ...d.sections, ...s.sections },
  };
}
