// Shared domain types. Money is always stored in minor units (cents) as integers.

export type Locale = "ru" | "en";
export const LOCALES: Locale[] = ["ru", "en"];

export type LocalizedText = { ru: string; en: string };

export type ProductStatus = "draft" | "published" | "hidden";

export interface ProductImage {
  id: string;
  url: string;
  /** Storage path, used to delete the file. Null for built-in demo images. */
  path: string | null;
  /** Optional link to a color: selecting the color shows this photo. */
  colorId: string | null;
}

export interface ProductColor {
  id: string;
  name: LocalizedText;
  hex: string;
}

export interface ProductSize {
  id: string;
  label: string;
}

export interface ProductVariant {
  id: string;
  colorId: string | null;
  sizeId: string | null;
  stock: number;
  /** Optional price override for this variant (minor units). */
  price: number | null;
}

export interface Product {
  id: string;
  slug: string;
  status: ProductStatus;
  categoryId: string | null;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  compareAtPrice: number | null;
  colors: ProductColor[];
  sizes: ProductSize[];
  variants: ProductVariant[];
  images: ProductImage[];
  /** Plain text table: one row per line, cells separated by "|". First line is the header. */
  sizeChart: string;
  isNew: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  position: number;
  visible: boolean;
  isDemo: boolean;
}

export interface StoreSettings {
  storeName: string;
  logoUrl: string | null;
  logoPath: string | null;
  heroImageUrl: string | null;
  heroImagePath: string | null;
  heroHeadline: LocalizedText;
  heroSubtitle: LocalizedText;
  aboutTitle: LocalizedText;
  aboutText: LocalizedText;
  contacts: {
    whatsapp: string;
    phone: string;
    email: string;
    city: LocalizedText;
    address: LocalizedText;
    instagramUrl: string;
    telegramUrl: string;
    threadsUrl: string;
  };
  policies: {
    delivery: LocalizedText;
    exchange: LocalizedText;
    returns: LocalizedText;
    deliveryChargedSeparately: boolean;
  };
  orderChannels: { whatsapp: boolean; instagram: boolean };
  currency: string;
  defaultLocale: Locale;
  enabledLocales: Locale[];
  colors: { primary: string; accent: string; background: string };
  sections: {
    categories: boolean;
    newArrivals: boolean;
    featured: boolean;
    about: boolean;
    instagram: boolean;
  };
}

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
}

export interface ResolvedCartLine {
  productId: string;
  variantId: string;
  qty: number;
  slug: string;
  name: LocalizedText;
  image: string | null;
  color: LocalizedText | null;
  size: string | null;
  unitPrice: number;
  stock: number;
  available: boolean;
}
