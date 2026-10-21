import { requireAdmin } from "@/lib/auth";
import { DemoCleanup } from "@/components/admin/DemoCleanup";

export const metadata = { title: "Резервная копия" };

export default async function BackupPage() {
  const { repo } = await requireAdmin();
  const [products, categories] = await Promise.all([repo.listProducts(), repo.listCategories()]);
  const demo = { products: products.filter((p) => p.isDemo).length, categories: categories.filter((c) => c.isDemo).length };
  return (
    <>
      <div className="a-head"><h1>Резервная копия и экспорт</h1></div>
      <section className="a-card">
        <h2>Скачать каталог</h2>
        <p>Товаров: {products.length}, категорий: {categories.length}.</p>
        <div className="a-row-actions">
          <a className="a-btn a-btn-primary" href="/api/admin/export?format=json" download>Полная копия (JSON)</a>
          <a className="a-btn" href="/api/admin/export?format=csv" download>Таблица для Excel (CSV)</a>
        </div>
        <p className="a-hint">JSON содержит все товары, категории и настройки сайта — храните его как резервную копию (например, раз в неделю и перед большими изменениями). CSV — одна строка на каждый вариант (цвет/размер) с ценой и остатком. Сами фото хранятся в облачном хранилище; в копии — ссылки на них.</p>
        {repo.mode === "supabase" ? (
          <p className="a-hint">Дополнительно Supabase делает ежедневные резервные копии базы на платных тарифах. Инструкция по полному бэкапу базы и фото — в README (раздел «Резервное копирование»).</p>
        ) : (
          <p className="a-hint">Локальный режим: все данные лежат в папке <code>.data/</code> проекта — её можно просто скопировать.</p>
        )}
      </section>
      <DemoCleanup demo={demo} />
    </>
  );
}
