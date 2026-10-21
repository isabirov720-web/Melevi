import { requireAdmin } from "@/lib/auth";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata = { title: "Категории" };

export default async function CategoriesPage() {
  const { repo } = await requireAdmin();
  const [categories, products] = await Promise.all([repo.listCategories(), repo.listProducts()]);
  const counts = Object.fromEntries(categories.map((c) => [c.id, products.filter((p) => p.categoryId === c.id).length]));
  return (
    <>
      <div className="a-head"><h1>Категории <span className="a-count">{categories.length}</span></h1></div>
      <CategoryManager key={categories.map((c) => `${c.id}${c.position}${c.visible}${c.name.ru}${c.name.en}${c.slug}`).join()} categories={categories} counts={counts} />
    </>
  );
}
