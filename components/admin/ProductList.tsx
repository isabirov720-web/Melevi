"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { totalStock, tr } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import type { Category, Product, ProductStatus } from "@/lib/types";
import { api } from "./client";
import { useFeedback } from "./Feedback";

export const STATUS_LABEL: Record<ProductStatus, string> = { published: "Опубликован", draft: "Черновик", hidden: "Скрыт" };

export function ProductList({ products, categories, currency }: { products: Product[]; categories: Category[]; currency: string }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | ProductStatus>("");
  const [cat, setCat] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const catName = new Map(categories.map((c) => [c.id, tr(c.name, "ru")]));

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (!q || `${p.name.ru} ${p.name.en}`.toLowerCase().includes(q.toLowerCase())) &&
          (!status || p.status === status) &&
          (!cat || p.categoryId === cat),
      ),
    [products, q, status, cat],
  );

  const quick = async (p: Product, patch: Partial<Pick<Product, "status" | "isFeatured">>, done: string) => {
    setBusy(p.id);
    const res = await api(`/api/admin/products/${p.id}`, "PATCH", patch);
    setBusy(null);
    if (!res.ok) return toast("error", res.error);
    toast("ok", done);
    router.refresh();
  };

  if (!products.length)
    return (
      <div className="a-empty">
        <p>Товаров пока нет.</p>
        <Link href="/admin/products/new" className="a-btn a-btn-primary">Добавить первый товар</Link>
      </div>
    );

  return (
    <>
      <div className="a-filters">
        <input type="search" placeholder="Поиск по названию" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по названию" />
        <select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus | "")} aria-label="Статус">
          <option value="">Все статусы</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
          <option value="hidden">Скрытые</option>
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Категория">
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{tr(c.name, "ru")}</option>)}
        </select>
      </div>
      {!list.length && <p className="a-empty">Ничего не найдено.</p>}
      <ul className="a-plist">
        {list.map((p) => {
          const stock = totalStock(p);
          return (
            <li key={p.id} className="a-prow">
              <Link href={`/admin/products/${p.id}`} className="a-pthumb" aria-hidden tabIndex={-1}>
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" loading="lazy" />
                )}
              </Link>
              <div className="a-pinfo">
                <Link href={`/admin/products/${p.id}`} className="a-pname">{tr(p.name, "ru")}</Link>
                <p className="a-pmeta">
                  <span className={`a-status a-status-${p.status}`}>{STATUS_LABEL[p.status]}</span>
                  {p.isDemo && <span className="a-tag a-tag-demo">Демо</span>}
                  {p.isNew && <span className="a-tag">New</span>}
                  {p.isFeatured && <span className="a-tag">★ На главной</span>}
                </p>
                <p className="a-pmeta">
                  <strong>{formatMoney(p.price, currency, "ru")}</strong>
                  {p.compareAtPrice != null && <s>{formatMoney(p.compareAtPrice, currency, "ru")}</s>}
                  <span>· {stock > 0 ? `в наличии: ${stock} шт.` : "нет в наличии"}</span>
                  {p.categoryId && <span>· {catName.get(p.categoryId)}</span>}
                </p>
              </div>
              <div className="a-pactions">
                <Link href={`/admin/products/${p.id}`} className="a-btn a-btn-sm">Изменить</Link>
                {p.status === "published" ? (
                  <button type="button" className="a-btn a-btn-sm a-btn-ghost" disabled={busy === p.id} onClick={() => quick(p, { status: "hidden" }, "Товар скрыт с сайта")}>Скрыть</button>
                ) : (
                  <button type="button" className="a-btn a-btn-sm a-btn-ghost" disabled={busy === p.id} onClick={() => quick(p, { status: "published" }, "Товар опубликован")}>Опубликовать</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
