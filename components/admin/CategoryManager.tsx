"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { slugify } from "@/lib/slug";
import type { Category, LocalizedText } from "@/lib/types";
import { api } from "./client";
import { useFeedback } from "./Feedback";

type Row = { id: string; name: LocalizedText; slug: string; visible: boolean; isDemo: boolean };

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<Row[]>(categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, visible: c.visible, isDemo: c.isDemo })));
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState<LocalizedText>({ ru: "", en: "" });
  const original = new Map(categories.map((c) => [c.id, JSON.stringify({ name: c.name, slug: c.slug, visible: c.visible })]));
  const changed = (r: Row) => original.get(r.id) !== JSON.stringify({ name: r.name, slug: r.slug, visible: r.visible });

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return toast("error", res.error ?? "Ошибка");
    toast("ok", okText);
    router.refresh();
  };

  const saveRow = (r: Row) =>
    run(() => api(`/api/admin/categories/${r.id}`, "PUT", { slug: r.slug || slugify(r.name.en || r.name.ru), name: r.name, visible: r.visible }), `Категория «${r.name.ru || r.name.en}» сохранена`);

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    run(() => api("/api/admin/categories", "PUT", { ids: next.map((r) => r.id) }), "Порядок категорий сохранён");
  };

  const remove = async (r: Row) => {
    const n = counts[r.id] ?? 0;
    const ok = await confirm({
      title: `Удалить категорию «${r.name.ru || r.name.en}»?`,
      text: n ? `${n} товар(ов) останутся на сайте, но без категории.` : "В категории нет товаров.",
    });
    if (ok) run(() => api(`/api/admin/categories/${r.id}`, "DELETE"), "Категория удалена");
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.ru.trim() && !newName.en.trim()) return toast("error", "Введите название категории");
    run(async () => {
      const res = await api("/api/admin/categories", "POST", { name: newName, slug: slugify(newName.en || newName.ru) || `cat-${Date.now().toString(36)}`, visible: true });
      if (res.ok) setNewName({ ru: "", en: "" });
      return res;
    }, "Категория добавлена");
  };

  return (
    <>
      <form className="a-card" onSubmit={add}>
        <h2>Новая категория</h2>
        <div className="a-grid2">
          <label className="a-field"><span className="a-label">Название (RU)</span><input value={newName.ru} onChange={(e) => setNewName({ ...newName, ru: e.target.value })} placeholder="Например, Платья" maxLength={60} /></label>
          <label className="a-field"><span className="a-label">Название (EN)</span><input value={newName.en} onChange={(e) => setNewName({ ...newName, en: e.target.value })} placeholder="e.g. Dresses" maxLength={60} /></label>
        </div>
        <button className="a-btn a-btn-primary" disabled={busy}>Добавить категорию</button>
      </form>

      {!rows.length && <p className="a-empty">Категорий пока нет.</p>}
      <ol className="a-catlist">
        {rows.map((r, i) => (
          <li key={r.id} className={`a-card a-cat ${r.visible ? "" : "is-hidden"}`}>
            <div className="a-cat-order">
              <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label={`Поднять «${r.name.ru}»`}>↑</button>
              <span className="a-count">{i + 1}</span>
              <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1 || busy} aria-label={`Опустить «${r.name.ru}»`}>↓</button>
            </div>
            <div className="a-cat-body">
              <div className="a-grid2">
                <label className="a-field"><span className="a-label">Название (RU)</span><input value={r.name.ru} onChange={(e) => update(r.id, { name: { ...r.name, ru: e.target.value } })} maxLength={60} /></label>
                <label className="a-field"><span className="a-label">Название (EN)</span><input value={r.name.en} onChange={(e) => update(r.id, { name: { ...r.name, en: e.target.value } })} maxLength={60} /></label>
              </div>
              <label className="a-field">
                <span className="a-label">Адрес</span>
                <input value={r.slug} onChange={(e) => update(r.id, { slug: slugify(e.target.value) })} autoCapitalize="off" />
                <span className="a-hint">/catalog?category={r.slug} · товаров: {counts[r.id] ?? 0}{r.isDemo ? " · демо" : ""}</span>
              </label>
              <label className="a-check">
                <input type="checkbox" checked={r.visible} onChange={(e) => update(r.id, { visible: e.target.checked })} />
                Показывать на сайте <span className="a-hint">(если выключить, товары этой категории тоже скроются)</span>
              </label>
              <div className="a-row-actions">
                <button type="button" className="a-btn a-btn-primary a-btn-sm" disabled={!changed(r) || busy} onClick={() => saveRow(r)}>{changed(r) ? "Сохранить" : "Сохранено"}</button>
                <button type="button" className="a-btn a-btn-sm a-btn-ghost a-danger-text" onClick={() => remove(r)} disabled={busy}>Удалить</button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
