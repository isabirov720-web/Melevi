import type { Category, Product, StoreSettings } from "../types";

/** Read access. Public instances only ever return published products and visible categories. */
export interface ReadRepo {
  mode: "local" | "supabase";
  getSettings(): Promise<StoreSettings>;
  listCategories(): Promise<Category[]>;
  listProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductById(id: string): Promise<Product | null>;
}

/** Owner-only operations. Only obtainable through requireAdmin(). */
export interface AdminRepo extends ReadRepo {
  saveProduct(p: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  saveCategory(c: Category): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  reorderCategories(ids: string[]): Promise<void>;
  saveSettings(s: StoreSettings): Promise<StoreSettings>;
  uploadFile(data: Buffer, contentType: string, ext: string, folder: string): Promise<{ url: string; path: string }>;
  deleteFiles(paths: string[]): Promise<void>;
  deleteDemoData(): Promise<{ products: number; categories: number }>;
}

/** An error whose message is safe and helpful to show to the owner. */
export class RepoError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
