// Development/demo backend: a JSON file and an uploads folder on the server's disk.
// Changes are shared by every visitor of this server, but NOT suitable for serverless
// hosting (Vercel), where the disk is temporary. Use Supabase in production.
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { withDefaults } from "../defaults";
import type { Category, Product, StoreSettings } from "../types";
import { RepoError, type AdminRepo } from "./types";

interface Db {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
}

// Local mode only; turbopackIgnore keeps this dynamic path from pulling the whole project into the server bundle.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.LOCAL_DATA_DIR || ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

let writeQueue: Promise<unknown> = Promise.resolve();
let seeding: Promise<Db> | null = null;

async function seed(): Promise<Db> {
  const demo = JSON.parse(await fs.readFile(path.resolve("data/demo.json"), "utf8"));
  return { settings: withDefaults(null), categories: demo.categories, products: demo.products };
}

async function readDb(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Db;
    db.settings = withDefaults(db.settings);
    return db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new RepoError("Файл данных повреждён. Восстановите его из резервной копии.", 500);
    // First run: create the data file once, even if several requests arrive together.
    seeding ??= seed().then(async (db) => {
      await writeDb(db);
      return db;
    });
    return structuredClone(await seeding);
  }
}

async function writeDb(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1));
  await fs.rename(tmp, DB_FILE);
}

/** Serializes read-modify-write cycles so concurrent saves don't overwrite each other. */
function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

const sortProducts = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt);

export function createLocalRepo(admin: boolean): AdminRepo {
  const visibleCategoryIds = (db: Db) => new Set(db.categories.filter((c) => c.visible).map((c) => c.id));
  const isPublic = (db: Db, p: Product) =>
    p.status === "published" && (!p.categoryId || visibleCategoryIds(db).has(p.categoryId));

  const ownerOnly = () => {
    if (!admin) throw new RepoError("Нет доступа", 403);
  };

  return {
    mode: "local",
    async getSettings() {
      return (await readDb()).settings;
    },
    async listCategories() {
      const db = await readDb();
      return db.categories.filter((c) => admin || c.visible).sort((a, b) => a.position - b.position);
    },
    async listProducts() {
      const db = await readDb();
      return db.products.filter((p) => admin || isPublic(db, p)).sort(sortProducts);
    },
    async getProductBySlug(slug) {
      const db = await readDb();
      const p = db.products.find((x) => x.slug === slug);
      return p && (admin || isPublic(db, p)) ? p : null;
    },
    async getProductById(id) {
      const db = await readDb();
      const p = db.products.find((x) => x.id === id);
      return p && (admin || isPublic(db, p)) ? p : null;
    },
    async saveProduct(p) {
      ownerOnly();
      return mutate((db) => {
        if (db.products.some((x) => x.slug === p.slug && x.id !== p.id))
          throw new RepoError("Такой адрес страницы уже используется другим товаром. Измените поле «Адрес страницы».");
        if (p.categoryId && !db.categories.some((c) => c.id === p.categoryId))
          throw new RepoError("Выбранная категория не найдена. Обновите страницу.");
        const i = db.products.findIndex((x) => x.id === p.id);
        if (i >= 0) db.products[i] = p;
        else db.products.push(p);
        return p;
      });
    },
    async deleteProduct(id) {
      ownerOnly();
      await mutate((db) => {
        db.products = db.products.filter((p) => p.id !== id);
      });
    },
    async saveCategory(c) {
      ownerOnly();
      return mutate((db) => {
        if (db.categories.some((x) => x.slug === c.slug && x.id !== c.id))
          throw new RepoError("Такой адрес категории уже используется.");
        const i = db.categories.findIndex((x) => x.id === c.id);
        if (i >= 0) db.categories[i] = c;
        else db.categories.push(c);
        return c;
      });
    },
    async deleteCategory(id) {
      ownerOnly();
      await mutate((db) => {
        db.categories = db.categories.filter((c) => c.id !== id);
        for (const p of db.products) if (p.categoryId === id) p.categoryId = null;
      });
    },
    async reorderCategories(ids) {
      ownerOnly();
      await mutate((db) => {
        ids.forEach((id, position) => {
          const c = db.categories.find((x) => x.id === id);
          if (c) c.position = position;
        });
      });
    },
    async saveSettings(s) {
      ownerOnly();
      return mutate((db) => {
        db.settings = s;
        return s;
      });
    },
    async uploadFile(data, _contentType, ext, folder) {
      ownerOnly();
      const name = `${randomUUID()}.${ext}`;
      const dir = path.join(UPLOAD_DIR, folder);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, name), data);
      const rel = `${folder}/${name}`;
      return { url: `/api/media/${rel}`, path: rel };
    },
    async deleteFiles(paths) {
      ownerOnly();
      for (const rel of paths) {
        const full = path.resolve(UPLOAD_DIR, rel);
        if (!full.startsWith(UPLOAD_DIR + path.sep)) continue;
        await fs.rm(full, { force: true });
      }
    },
    async deleteDemoData() {
      ownerOnly();
      return mutate((db) => {
        const before = { p: db.products.length, c: db.categories.length };
        const demoCats = new Set(db.categories.filter((c) => c.isDemo).map((c) => c.id));
        db.products = db.products.filter((p) => !p.isDemo);
        db.categories = db.categories.filter((c) => !c.isDemo);
        for (const p of db.products) if (p.categoryId && demoCats.has(p.categoryId)) p.categoryId = null;
        if (db.settings.heroImageUrl?.startsWith("/demo/")) db.settings.heroImageUrl = null;
        return { products: before.p - db.products.length, categories: before.c - db.categories.length };
      });
    },
  };
}
