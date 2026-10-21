"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./client";
import { useFeedback } from "./Feedback";

export function DemoCleanup({ demo }: { demo: { products: number; categories: number } }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  const total = demo.products + demo.categories;

  const run = async () => {
    const ok = await confirm({
      title: "Удалить все демо-данные?",
      text: `Будут удалены демо-товары (${demo.products}) и демо-категории (${demo.categories}), а также демо-баннер. Ваши собственные товары не пострадают.`,
      confirmLabel: "Удалить демо-данные",
    });
    if (!ok) return;
    setBusy(true);
    const res = await api<{ removed: { products: number; categories: number } }>("/api/admin/demo", "DELETE");
    setBusy(false);
    if (!res.ok) return toast("error", res.error);
    toast("ok", `Удалено: товаров ${res.removed.products}, категорий ${res.removed.categories}`);
    router.refresh();
  };

  return (
    <section className="a-card">
      <h2>Демо-данные</h2>
      {total ? (
        <>
          <p>Сейчас на сайте демо-товаров: <strong>{demo.products}</strong>, демо-категорий: <strong>{demo.categories}</strong>. Они помечены «Демо» и нужны только для примера.</p>
          <button type="button" className="a-btn a-btn-danger" onClick={run} disabled={busy}>{busy ? "Удаляем…" : "Удалить демо-данные"}</button>
          <p className="a-hint">Совет: сначала создайте свои категории и добавьте пару настоящих товаров, затем удалите демо.</p>
        </>
      ) : (
        <p className="a-hint">Демо-данных нет — каталог содержит только ваши товары.</p>
      )}
    </section>
  );
}
