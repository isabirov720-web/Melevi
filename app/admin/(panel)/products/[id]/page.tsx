import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { tr } from "@/lib/catalog";
import { ProductEditor } from "@/components/admin/ProductEditor";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { repo } = await requireAdmin();
  const p = await repo.getProductById((await params).id);
  return { title: p ? tr(p.name, "ru") : "Товар не найден" };
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const { repo } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [product, categories, settings] = await Promise.all([repo.getProductById(id), repo.listCategories(), repo.getSettings()]);
  if (!product) notFound();
  return <ProductEditor key={product.updatedAt} product={product} categories={categories} currency={settings.currency} />;
}
