import { requireAdmin } from "@/lib/auth";
import { ProductEditor } from "@/components/admin/ProductEditor";

export const metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const { repo } = await requireAdmin();
  const [categories, settings] = await Promise.all([repo.listCategories(), repo.getSettings()]);
  return <ProductEditor product={null} categories={categories} currency={settings.currency} />;
}
