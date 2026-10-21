// Production backend: Supabase Postgres (with Row-Level Security) + Supabase Storage.
import "server-only";
import { randomUUID } from "node:crypto";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { withDefaults } from "../defaults";
import { MEDIA_BUCKET } from "../supabase/clients";
import type { Category, Product, StoreSettings } from "../types";
import { RepoError, type AdminRepo } from "./types";

type ProductRow = {
  id: string;
  slug: string;
  status: Product["status"];
  category_id: string | null;
  name: Product["name"];
  description: Product["description"];
  price: number;
  compare_at_price: number | null;
  colors: Product["colors"];
  sizes: Product["sizes"];
  variants: Product["variants"];
  images: Product["images"];
  size_chart: string;
  is_new: boolean;
  is_featured: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryRow = { id: string; slug: string; name: Category["name"]; position: number; visible: boolean; is_demo: boolean };

const fromProductRow = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  status: r.status,
  categoryId: r.category_id,
  name: r.name,
  description: r.description,
  price: r.price,
  compareAtPrice: r.compare_at_price,
  colors: r.colors ?? [],
  sizes: r.sizes ?? [],
  variants: r.variants ?? [],
  images: r.images ?? [],
  sizeChart: r.size_chart ?? "",
  isNew: r.is_new,
  isFeatured: r.is_featured,
  isDemo: r.is_demo,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toProductRow = (p: Product) => ({
  id: p.id,
  slug: p.slug,
  status: p.status,
  category_id: p.categoryId,
  name: p.name,
  description: p.description,
  price: p.price,
  compare_at_price: p.compareAtPrice,
  colors: p.colors,
  sizes: p.sizes,
  variants: p.variants,
  images: p.images,
  size_chart: p.sizeChart,
  is_new: p.isNew,
  is_featured: p.isFeatured,
  is_demo: p.isDemo,
  created_at: p.createdAt,
});

const fromCategoryRow = (r: CategoryRow): Category => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  position: r.position,
  visible: r.visible,
  isDemo: r.is_demo,
});

/** Turns database errors into messages the owner can act on. */
function fail(error: PostgrestError | { message: string; code?: string } | null, context: string): never {
  const code = error && "code" in error ? error.code : undefined;
  if (code === "23505") throw new RepoError(`${context}: такой адрес страницы уже используется.`);
  if (code === "42501" || code === "PGRST301") throw new RepoError(`${context}: нет прав. Войдите заново.`, 403);
  if (code === "23514") throw new RepoError(`${context}: данные не прошли проверку (цена или остаток).`);
  if (code === "23503") throw new RepoError(`${context}: выбранная категория не найдена.`);
  console.error(context, error);
  throw new RepoError(`${context}: ошибка базы данных. Попробуйте ещё раз.`, 500);
}

export function createSupabaseRepo(db: SupabaseClient, admin: boolean): AdminRepo {
  const ownerOnly = () => {
    if (!admin) throw new RepoError("Нет доступа", 403);
  };

  const productQuery = () => {
    const q = db.from("products").select("*");
    return admin ? q : q.eq("status", "published");
  };

  async function visibleCategoryIds() {
    const { data, error } = await db.from("categories").select("id").eq("visible", true);
    if (error) fail(error, "Загрузка категорий");
    return new Set((data ?? []).map((c: { id: string }) => c.id));
  }

  async function publicFilter(products: Product[]) {
    if (admin) return products;
    const visible = await visibleCategoryIds();
    return products.filter((p) => !p.categoryId || visible.has(p.categoryId));
  }

  return {
    mode: "supabase",
    async getSettings() {
      const { data, error } = await db.from("store_settings").select("data").eq("id", 1).maybeSingle();
      if (error) fail(error, "Загрузка настроек");
      return withDefaults(data?.data as Partial<StoreSettings> | undefined);
    },
    async listCategories() {
      let q = db.from("categories").select("*").order("position");
      if (!admin) q = q.eq("visible", true);
      const { data, error } = await q;
      if (error) fail(error, "Загрузка категорий");
      return (data as CategoryRow[]).map(fromCategoryRow);
    },
    async listProducts() {
      const { data, error } = await productQuery().order("created_at", { ascending: false });
      if (error) fail(error, "Загрузка товаров");
      return publicFilter((data as ProductRow[]).map(fromProductRow));
    },
    async getProductBySlug(slug) {
      const { data, error } = await productQuery().eq("slug", slug).maybeSingle();
      if (error) fail(error, "Загрузка товара");
      if (!data) return null;
      return (await publicFilter([fromProductRow(data as ProductRow)]))[0] ?? null;
    },
    async getProductById(id) {
      const { data, error } = await productQuery().eq("id", id).maybeSingle();
      if (error) fail(error, "Загрузка товара");
      if (!data) return null;
      return (await publicFilter([fromProductRow(data as ProductRow)]))[0] ?? null;
    },
    async saveProduct(p) {
      ownerOnly();
      const { data, error } = await db.from("products").upsert(toProductRow(p)).select("*").single();
      if (error) fail(error, "Сохранение товара");
      return fromProductRow(data as ProductRow);
    },
    async deleteProduct(id) {
      ownerOnly();
      const { error } = await db.from("products").delete().eq("id", id);
      if (error) fail(error, "Удаление товара");
    },
    async saveCategory(c) {
      ownerOnly();
      const row = { id: c.id, slug: c.slug, name: c.name, position: c.position, visible: c.visible, is_demo: c.isDemo };
      const { data, error } = await db.from("categories").upsert(row).select("*").single();
      if (error) fail(error, "Сохранение категории");
      return fromCategoryRow(data as CategoryRow);
    },
    async deleteCategory(id) {
      ownerOnly();
      const { error } = await db.from("categories").delete().eq("id", id);
      if (error) fail(error, "Удаление категории");
    },
    async reorderCategories(ids) {
      ownerOnly();
      const results = await Promise.all(
        ids.map((id, position) => db.from("categories").update({ position }).eq("id", id)),
      );
      const failed = results.find((r) => r.error);
      if (failed) fail(failed.error, "Сортировка категорий");
    },
    async saveSettings(s) {
      ownerOnly();
      const { error } = await db.from("store_settings").upsert({ id: 1, data: s });
      if (error) fail(error, "Сохранение настроек");
      return s;
    },
    async uploadFile(data, contentType, ext, folder) {
      ownerOnly();
      const path = `${folder}/${randomUUID()}.${ext}`;
      const { error } = await db.storage
        .from(MEDIA_BUCKET)
        .upload(path, data, { contentType, cacheControl: "31536000", upsert: false });
      if (error) fail({ message: error.message }, "Загрузка фото");
      const { data: pub } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return { url: pub.publicUrl, path };
    },
    async deleteFiles(paths) {
      ownerOnly();
      if (!paths.length) return;
      const { error } = await db.storage.from(MEDIA_BUCKET).remove(paths);
      if (error) console.error("Не удалось удалить файлы", error);
    },
    async deleteDemoData() {
      ownerOnly();
      const p = await db.from("products").delete().eq("is_demo", true).select("id");
      if (p.error) fail(p.error, "Удаление демо-товаров");
      const c = await db.from("categories").delete().eq("is_demo", true).select("id");
      if (c.error) fail(c.error, "Удаление демо-категорий");
      const settings = await this.getSettings();
      if (settings.heroImageUrl?.startsWith("/demo/")) await this.saveSettings({ ...settings, heroImageUrl: null });
      return { products: p.data?.length ?? 0, categories: c.data?.length ?? 0 };
    },
  };
}
