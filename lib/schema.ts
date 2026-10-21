// Server-side validation for everything the admin panel saves.
import { z } from "zod";
import { syncVariants } from "./catalog";
import { SLUG_RE } from "./slug";
import type { Category, Product, StoreSettings } from "./types";

const MAX_PRICE = 100_000_000; // 1,000,000.00 in minor units
const MAX_STOCK = 100_000;

const id = z.string().uuid("Некорректный идентификатор");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет должен быть в формате #RRGGBB");
const text = (max: number) => z.string().trim().max(max, `Слишком длинный текст (максимум ${max} символов)`);
const localized = (max: number) => z.object({ ru: text(max), en: text(max) });
const requiredLocalized = (max: number, label: string) =>
  localized(max).refine((v) => v.ru.length > 0 || v.en.length > 0, `Укажите ${label}`);
const money = z
  .number({ invalid_type_error: "Цена должна быть числом" })
  .int("Цена указана неверно")
  .min(0, "Цена не может быть отрицательной")
  .max(MAX_PRICE, "Слишком большая цена");
const mediaUrl = z
  .string()
  .max(1000)
  .refine((u) => u.startsWith("/") || /^https:\/\//.test(u), "Некорректная ссылка на изображение");
const httpsUrlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((u) => u === "" || /^https:\/\/[^\s]+$/.test(u), "Ссылка должна начинаться с https://");

export const productInput = z
  .object({
    id: id.optional(),
    slug: z.string().trim().min(1, "Укажите адрес страницы").max(80).regex(SLUG_RE, "Адрес: только латиница, цифры и дефис"),
    status: z.enum(["draft", "published", "hidden"]),
    categoryId: id.nullable(),
    name: requiredLocalized(160, "название товара"),
    description: localized(5000),
    price: money,
    compareAtPrice: money.nullable(),
    colors: z
      .array(z.object({ id, name: requiredLocalized(40, "название цвета"), hex }))
      .max(30, "Слишком много цветов"),
    sizes: z.array(z.object({ id, label: text(20).min(1, "Укажите размер") })).max(40, "Слишком много размеров"),
    variants: z
      .array(
        z.object({
          id,
          colorId: id.nullable(),
          sizeId: id.nullable(),
          stock: z
            .number({ invalid_type_error: "Остаток должен быть числом" })
            .int("Остаток должен быть целым числом")
            .min(0, "Остаток не может быть отрицательным")
            .max(MAX_STOCK, "Слишком большой остаток"),
          price: money.nullable(),
        }),
      )
      .max(1200),
    images: z
      .array(z.object({ id, url: mediaUrl, path: z.string().max(300).nullable(), colorId: id.nullable() }))
      .max(30, "Максимум 30 фото у одного товара"),
    sizeChart: text(4000),
    isNew: z.boolean(),
    isFeatured: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (p.compareAtPrice != null && p.compareAtPrice <= p.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Старая цена должна быть больше текущей (или оставьте поле пустым)" });
    }
    const unique = (arr: string[]) => new Set(arr).size === arr.length;
    if (!unique(p.colors.map((c) => (c.name.ru || c.name.en).toLowerCase())))
      ctx.addIssue({ code: "custom", path: ["colors"], message: "Цвета не должны повторяться" });
    if (!unique(p.sizes.map((s) => s.label.toLowerCase())))
      ctx.addIssue({ code: "custom", path: ["sizes"], message: "Размеры не должны повторяться" });
    const allIds = [...p.colors, ...p.sizes, ...p.variants, ...p.images].map((x) => x.id);
    if (!unique(allIds)) ctx.addIssue({ code: "custom", message: "Повторяющиеся идентификаторы — обновите страницу" });
    const colorIds = new Set(p.colors.map((c) => c.id));
    p.images.forEach((img, i) => {
      if (img.colorId && !colorIds.has(img.colorId))
        ctx.addIssue({ code: "custom", path: ["images", i], message: "Фото привязано к удалённому цвету" });
    });
    if (p.status === "published" && p.images.length === 0)
      ctx.addIssue({ code: "custom", path: ["images"], message: "Чтобы опубликовать товар, добавьте хотя бы одно фото" });
  });

export type ProductInput = z.infer<typeof productInput>;

/** Normalizes validated input into a stored product. Variants are rebuilt from colors × sizes. */
export function toProduct(input: ProductInput, prev: Product | null, newId: () => string, isDemo = false): Product {
  const now = new Date().toISOString();
  const productId = prev?.id ?? input.id ?? newId();
  return {
    id: productId,
    slug: input.slug,
    status: input.status,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    colors: input.colors,
    sizes: input.sizes,
    variants: syncVariants(input, (colorId, sizeId) => ({ id: newId(), colorId, sizeId, stock: 0, price: null })),
    images: input.images,
    sizeChart: input.sizeChart,
    isNew: input.isNew,
    isFeatured: input.isFeatured,
    isDemo: prev?.isDemo ?? isDemo,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

export const categoryInput = z.object({
  id: id.optional(),
  slug: z.string().trim().min(1, "Укажите адрес категории").max(60).regex(SLUG_RE, "Адрес: только латиница, цифры и дефис"),
  name: requiredLocalized(60, "название категории"),
  visible: z.boolean(),
});

export function toCategory(input: z.infer<typeof categoryInput>, prev: Category | null, position: number, newId: () => string): Category {
  return {
    id: prev?.id ?? newId(),
    slug: input.slug,
    name: input.name,
    visible: input.visible,
    position: prev?.position ?? position,
    isDemo: prev?.isDemo ?? false,
  };
}

export const reorderInput = z.object({ ids: z.array(id).max(200) });

export const settingsInput: z.ZodType<StoreSettings> = z.object({
  storeName: text(60).min(1, "Укажите название магазина"),
  logoUrl: mediaUrl.nullable(),
  logoPath: z.string().max(300).nullable(),
  heroImageUrl: mediaUrl.nullable(),
  heroImagePath: z.string().max(300).nullable(),
  heroHeadline: localized(120),
  heroSubtitle: localized(240),
  aboutTitle: localized(120),
  aboutText: localized(4000),
  contacts: z.object({
    whatsapp: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === "" || /^\+?[\d\s\-()]{7,25}$/.test(v), "Номер WhatsApp: только цифры с кодом страны, например +996 555 123 456"),
    phone: text(30),
    email: z.string().trim().max(120).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некорректный email"),
    city: localized(80),
    address: localized(300),
    instagramUrl: httpsUrlOrEmpty,
    telegramUrl: httpsUrlOrEmpty,
    threadsUrl: httpsUrlOrEmpty,
  }),
  policies: z.object({
    delivery: localized(3000),
    exchange: localized(3000),
    returns: localized(3000),
    deliveryChargedSeparately: z.boolean(),
  }),
  orderChannels: z.object({ whatsapp: z.boolean(), instagram: z.boolean() }),
  currency: z.string().regex(/^[A-Z]{3}$/, "Неверный код валюты"),
  defaultLocale: z.enum(["ru", "en"]),
  enabledLocales: z.array(z.enum(["ru", "en"])).min(1, "Включите хотя бы один язык"),
  colors: z.object({ primary: hex, accent: hex, background: hex }),
  sections: z.object({
    categories: z.boolean(),
    newArrivals: z.boolean(),
    featured: z.boolean(),
    about: z.boolean(),
    instagram: z.boolean(),
  }),
}).refine((s) => s.enabledLocales.includes(s.defaultLocale), "Основной язык должен быть включён");

export function firstError(err: z.ZodError) {
  const issue = err.issues[0];
  return issue ? issue.message : "Проверьте введённые данные";
}
