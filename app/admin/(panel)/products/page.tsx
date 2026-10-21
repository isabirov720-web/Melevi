import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ProductList } from "@/components/admin/ProductList";

export const metadata = { title: "Товары" };

export default async function ProductsPage() {
  const { repo } = await requireAdmin();
  const [products, categories, settings] = await Promise.all([repo.listProducts(), repo.listCategories(), repo.getSettings()]);
  return (
    <>
      <div className="a-head">
        <h1>Товары <span className="a-count">{products.length}</span></h1>
        <Link href="/admin/products/new" className="a-btn a-btn-primary">+ Добавить товар</Link>
      </div>
      <ProductList products={products} categories={categories} currency={settings.currency} />
    </>
  );
}
