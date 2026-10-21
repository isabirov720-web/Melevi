import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getLocale, getSettings, siteUrl } from "@/lib/store-server";
import { tr } from "@/lib/catalog";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const sans = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-sans", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  const description = tr(settings.heroSubtitle, locale) || tr(settings.heroHeadline, locale);
  const image = settings.heroImageUrl && !settings.heroImageUrl.endsWith(".svg") ? settings.heroImageUrl : undefined;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: settings.storeName, template: `%s — ${settings.storeName}` },
    description,
    openGraph: {
      type: "website",
      siteName: settings.storeName,
      title: settings.storeName,
      description,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf8f4" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale().catch(() => "ru" as const);
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
