"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { syncVariants, tr } from "@/lib/catalog";
import { moneyToInput, parseMoney } from "@/lib/format";
import { slugify } from "@/lib/slug";
import type { Category, LocalizedText, Product, ProductColor, ProductImage, ProductSize, ProductStatus } from "@/lib/types";
import { api, uid, uploadImage } from "./client";
import { useFeedback } from "./Feedback";
import { Bilingual, Field, Toggle } from "./Fields";

type VariantDraft = { id: string; colorId: string | null; sizeId: string | null; stock: string; price: string };
interface Draft {
  name: LocalizedText;
  description: LocalizedText;
  slug: string;
  slugTouched: boolean;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  colors: ProductColor[];
  sizes: ProductSize[];
  variants: VariantDraft[];
  images: ProductImage[];
  sizeChart: string;
  isNew: boolean;
  isFeatured: boolean;
  status: ProductStatus;
}

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "One size"];
const CHART_TEMPLATE = "Размер | Обхват груди, см | Обхват талии, см | Обхват бёдер, см\nS | | |\nM | | |\nL | | |";
const newVariant = (colorId: string | null, sizeId: string | null): VariantDraft => ({ id: uid(), colorId, sizeId, stock: "0", price: "" });

function toDraft(p: Product | null): Draft {
  if (!p)
    return {
      name: { ru: "", en: "" }, description: { ru: "", en: "" }, slug: "", slugTouched: false, categoryId: "",
      price: "", compareAtPrice: "", colors: [], sizes: [], variants: [newVariant(null, null)], images: [],
      sizeChart: "", isNew: true, isFeatured: false, status: "draft",
    };
  return {
    name: p.name, description: p.description, slug: p.slug, slugTouched: true, categoryId: p.categoryId ?? "",
    price: moneyToInput(p.price), compareAtPrice: moneyToInput(p.compareAtPrice), colors: p.colors, sizes: p.sizes,
    variants: p.variants.map((v) => ({ id: v.id, colorId: v.colorId, sizeId: v.sizeId, stock: String(v.stock), price: moneyToInput(v.price) })),
    images: p.images, sizeChart: p.sizeChart, isNew: p.isNew, isFeatured: p.isFeatured, status: p.status,
  };
}

export function ProductEditor({ product, categories, currency }: { product: Product | null; categories: Category[]; currency: string }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [d, setD] = useState<Draft>(() => toDraft(product));
  const initial = useRef(JSON.stringify(toDraft(product)));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [newSize, setNewSize] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(d) !== initial.current;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  /** Updates colors/sizes and rebuilds the variant list (keeping existing stock). */
  const setOptions = (colors: ProductColor[], sizes: ProductSize[]) =>
    setD((prev) => {
      const colorIds = new Set(colors.map((c) => c.id));
      return {
        ...prev,
        colors,
        sizes,
        variants: syncVariants({ colors, sizes, variants: prev.variants }, newVariant),
        images: prev.images.map((img) => (img.colorId && !colorIds.has(img.colorId) ? { ...img, colorId: null } : img)),
      };
    });

  const setName = (name: LocalizedText) =>
    setD((prev) => ({ ...prev, name, slug: prev.slugTouched ? prev.slug : slugify(name.en || name.ru) }));

  // ---------- Photos ----------
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, 30 - d.images.length);
    setUploading({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      try {
        const { url, path } = await uploadImage(file, "products");
        setD((prev) => ({ ...prev, images: [...prev.images, { id: uid(), url, path, colorId: null }] }));
      } catch (e) {
        toast("error", (e as Error).message);
      }
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const moveImage = (i: number, delta: number) =>
    setD((prev) => {
      const images = [...prev.images];
      const j = i + delta;
      if (j < 0 || j >= images.length) return prev;
      [images[i], images[j]] = [images[j], images[i]];
      return { ...prev, images };
    });
  const makeMain = (i: number) =>
    setD((prev) => ({ ...prev, images: [prev.images[i], ...prev.images.filter((_, k) => k !== i)] }));
  const removeImage = (i: number) => setD((prev) => ({ ...prev, images: prev.images.filter((_, k) => k !== i) }));
  const setImageColor = (i: number, colorId: string) =>
    setD((prev) => ({ ...prev, images: prev.images.map((img, k) => (k === i ? { ...img, colorId: colorId || null } : img)) }));

  // ---------- Sizes ----------
  const addSize = (label: string) => {
    const l = label.trim();
    if (!l) return;
    if (d.sizes.some((s) => s.label.toLowerCase() === l.toLowerCase())) return toast("error", `Размер «${l}» уже добавлен`);
    setOptions(d.colors, [...d.sizes, { id: uid(), label: l }]);
    setNewSize("");
  };
  const moveSize = (i: number, delta: number) => {
    const sizes = [...d.sizes];
    const j = i + delta;
    if (j < 0 || j >= sizes.length) return;
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
    setOptions(d.colors, sizes);
  };

  const colorName = (id: string | null) => (id ? tr(d.colors.find((c) => c.id === id)?.name, "ru") || "Без названия" : "");
  const sizeLabel = (id: string | null) => (id ? d.sizes.find((s) => s.id === id)?.label ?? "" : "");
  const totalStock = useMemo(() => d.variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0), [d.variants]);

  // ---------- Save ----------
  const save = async (statusOverride?: ProductStatus) => {
    setError("");
    const status = statusOverride ?? d.status;
    const price = parseMoney(d.price);
    if (!d.name.ru.trim() && !d.name.en.trim()) return setError("Укажите название товара");
    if (price == null) return setError("Укажите цену числом, например 120 или 120.50");
    const compareAtPrice = d.compareAtPrice.trim() ? parseMoney(d.compareAtPrice) : null;
    if (d.compareAtPrice.trim() && compareAtPrice == null) return setError("Старая цена указана неверно");
    const variants = [];
    for (const v of d.variants) {
      const stock = v.stock.trim() === "" ? 0 : Number(v.stock);
      if (!Number.isInteger(stock) || stock < 0) return setError(`Остаток для «${[colorName(v.colorId), sizeLabel(v.sizeId)].filter(Boolean).join(" / ") || "товара"}» должен быть целым числом от 0`);
      const vp = v.price.trim() ? parseMoney(v.price) : null;
      if (v.price.trim() && vp == null) return setError("Цена варианта указана неверно");
      variants.push({ id: v.id, colorId: v.colorId, sizeId: v.sizeId, stock, price: vp });
    }
    const slug = d.slug || slugify(d.name.en || d.name.ru) || `item-${Date.now().toString(36)}`;
    const payload = {
      slug, status, categoryId: d.categoryId || null, name: d.name, description: d.description, price, compareAtPrice,
      colors: d.colors, sizes: d.sizes, variants, images: d.images, sizeChart: d.sizeChart, isNew: d.isNew, isFeatured: d.isFeatured,
    };
    setSaving(true);
    const res = product
      ? await api<{ product: Product }>(`/api/admin/products/${product.id}`, "PUT", payload)
      : await api<{ product: Product }>("/api/admin/products", "POST", payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast("error", res.error);
      return;
    }
    initial.current = JSON.stringify(d);
    const msg = status === "published" ? "Товар сохранён и опубликован на сайте" : status === "draft" ? "Черновик сохранён (на сайте не виден)" : "Товар сохранён и скрыт с сайта";
    toast("ok", msg);
    if (!product) router.replace(`/admin/products/${res.product.id}`);
    router.refresh();
  };

  const remove = async () => {
    if (!product) return;
    const ok = await confirm({ title: "Удалить товар?", text: `«${tr(product.name, "ru")}» и все его фото будут удалены навсегда. Если товар нужен позже — лучше скройте его.` });
    if (!ok) return;
    const res = await api(`/api/admin/products/${product.id}`, "DELETE");
    if (!res.ok) return toast("error", res.error);
    initial.current = JSON.stringify(d);
    toast("ok", "Товар удалён");
    router.push("/admin/products");
    router.refresh();
  };

  return (
    <form className="a-editor" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <div className="a-head">
        <div>
          <Link href="/admin/products" className="a-back">← Все товары</Link>
          <h1>{product ? tr(product.name, "ru") || "Товар" : "Новый товар"}</h1>
          {product?.isDemo && <span className="a-tag a-tag-demo">Демо-товар</span>}
        </div>
        {product?.status === "published" && (
          <a href={`/product/${product.slug}`} target="_blank" rel="noopener" className="a-btn a-btn-sm">Открыть на сайте ↗</a>
        )}
      </div>

      <section className="a-card">
        <h2>Основное</h2>
        <Bilingual label="Название" value={d.name} onChange={setName} required maxLength={160} />
        <Field label="Категория">
          <select value={d.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Без категории</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{tr(c.name, "ru")}{c.visible ? "" : " (скрыта)"}</option>)}
          </select>
        </Field>
        <Bilingual label="Описание" value={d.description} onChange={(v) => set("description", v)} multiline rows={5} maxLength={5000} hint="Ткань, посадка, уход, рост модели. Пустая строка = новый абзац." />
        <Field label="Адрес страницы" hint={<>Ссылка на товар: <code>/product/{d.slug || "…"}</code>. Создаётся автоматически; меняйте, только если нужно.</>}>
          <input value={d.slug} onChange={(e) => setD((p) => ({ ...p, slug: slugify(e.target.value), slugTouched: true }))} inputMode="url" autoCapitalize="off" />
        </Field>
      </section>

      <section className="a-card">
        <h2>Цена, {currency}</h2>
        <div className="a-grid2">
          <Field label="Цена" required>
            <input inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} placeholder="Например, 120" />
          </Field>
          <Field label="Старая цена (для скидки)" hint="Заполните, чтобы показать зачёркнутую цену и метку Sale. Должна быть больше цены.">
            <input inputMode="decimal" value={d.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} placeholder="Необязательно" />
          </Field>
        </div>
      </section>

      <section className="a-card">
        <h2>Фото <span className="a-count">{d.images.length}</span></h2>
        <p className="a-hint">Первое фото — главное (показывается в каталоге). Фото сжимаются автоматически. Можно привязать фото к цвету — при выборе цвета покупатель увидит это фото.</p>
        <div className="a-images">
          {d.images.map((img, i) => (
            <div key={img.id} className="a-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Фото ${i + 1}`} />
              {i === 0 && <span className="a-image-main">Главное</span>}
              <div className="a-image-tools">
                <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`Переместить фото ${i + 1} влево`}>←</button>
                <button type="button" onClick={() => moveImage(i, 1)} disabled={i === d.images.length - 1} aria-label={`Переместить фото ${i + 1} вправо`}>→</button>
                {i > 0 && <button type="button" onClick={() => makeMain(i)} className="a-text-btn">Главное</button>}
                <button type="button" onClick={() => removeImage(i)} className="a-danger-text" aria-label={`Удалить фото ${i + 1}`}>✕</button>
              </div>
              {d.colors.length > 0 && (
                <select value={img.colorId ?? ""} onChange={(e) => setImageColor(i, e.target.value)} aria-label={`Цвет для фото ${i + 1}`}>
                  <option value="">Любой цвет</option>
                  {d.colors.map((c) => <option key={c.id} value={c.id}>{colorName(c.id)}</option>)}
                </select>
              )}
            </div>
          ))}
          <label className={`a-upload ${uploading ? "busy" : ""}`}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" multiple onChange={(e) => onFiles(e.target.files)} disabled={!!uploading} />
            <span aria-hidden className="a-upload-plus">+</span>
            <span>{uploading ? `Загрузка ${uploading.done} из ${uploading.total}…` : "Добавить фото"}</span>
            <span className="a-hint">с телефона или компьютера</span>
          </label>
        </div>
      </section>

      <section className="a-card">
        <h2>Цвета</h2>
        {d.colors.length === 0 && <p className="a-hint">Если у товара один цвет, можно не добавлять цвета.</p>}
        <ul className="a-colors">
          {d.colors.map((c, i) => (
            <li key={c.id} className="a-color-row">
              <input type="color" value={c.hex} aria-label={`Оттенок цвета ${i + 1}`} onChange={(e) => setOptions(d.colors.map((x) => (x.id === c.id ? { ...x, hex: e.target.value } : x)), d.sizes)} />
              <input placeholder="Название (RU), напр. Чёрный" value={c.name.ru} aria-label="Название цвета по-русски" onChange={(e) => setOptions(d.colors.map((x) => (x.id === c.id ? { ...x, name: { ...x.name, ru: e.target.value } } : x)), d.sizes)} />
              <input placeholder="Name (EN), e.g. Black" value={c.name.en} aria-label="Название цвета по-английски" onChange={(e) => setOptions(d.colors.map((x) => (x.id === c.id ? { ...x, name: { ...x.name, en: e.target.value } } : x)), d.sizes)} />
              <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => setOptions(d.colors.filter((x) => x.id !== c.id), d.sizes)} aria-label={`Удалить цвет ${c.name.ru || i + 1}`}>Удалить</button>
            </li>
          ))}
        </ul>
        <button type="button" className="a-btn a-btn-sm" onClick={() => setOptions([...d.colors, { id: uid(), name: { ru: "", en: "" }, hex: "#1b1a19" }], d.sizes)}>+ Добавить цвет</button>
      </section>

      <section className="a-card">
        <h2>Размеры</h2>
        <div className="a-chips">
          {d.sizes.map((s, i) => (
            <span key={s.id} className="a-chip">
              <button type="button" onClick={() => moveSize(i, -1)} disabled={i === 0} aria-label={`Сдвинуть ${s.label} влево`}>‹</button>
              {s.label}
              <button type="button" onClick={() => moveSize(i, 1)} disabled={i === d.sizes.length - 1} aria-label={`Сдвинуть ${s.label} вправо`}>›</button>
              <button type="button" onClick={() => setOptions(d.colors, d.sizes.filter((x) => x.id !== s.id))} aria-label={`Удалить размер ${s.label}`}>✕</button>
            </span>
          ))}
          {!d.sizes.length && <span className="a-hint">Размеры не добавлены (например, для аксессуаров).</span>}
        </div>
        <div className="a-inline">
          <input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Свой размер, напр. 42" aria-label="Новый размер" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(newSize); } }} maxLength={20} />
          <button type="button" className="a-btn a-btn-sm" onClick={() => addSize(newSize)}>Добавить</button>
        </div>
        <div className="a-presets">
          Быстро: {SIZE_PRESETS.filter((p) => !d.sizes.some((s) => s.label === p)).map((p) => (
            <button key={p} type="button" className="a-text-btn" onClick={() => addSize(p)}>+{p}</button>
          ))}
        </div>
      </section>

      <section className="a-card">
        <h2>Наличие <span className="a-count">{totalStock} шт.</span></h2>
        <p className="a-hint">Укажите остаток для каждого варианта. 0 — нет в наличии: покупатель не сможет выбрать этот вариант. Цену варианта заполняйте, только если она отличается от основной.</p>
        <div className="a-inline">
          <input inputMode="numeric" value={bulkStock} onChange={(e) => setBulkStock(e.target.value.replace(/\D/g, ""))} placeholder="Кол-во" aria-label="Остаток для всех вариантов" />
          <button type="button" className="a-btn a-btn-sm" disabled={!bulkStock} onClick={() => set("variants", d.variants.map((v) => ({ ...v, stock: bulkStock })))}>Применить ко всем</button>
        </div>
        <div className="a-variants" role="table" aria-label="Остатки по вариантам">
          <div className="a-vrow a-vhead" role="row">
            <span role="columnheader">Вариант</span><span role="columnheader">Остаток</span><span role="columnheader">Своя цена</span>
          </div>
          {d.variants.map((v) => {
            const label = [colorName(v.colorId), sizeLabel(v.sizeId)].filter(Boolean).join(" / ") || "Единственный вариант";
            const out = (parseInt(v.stock) || 0) <= 0;
            return (
              <div key={v.id} className={`a-vrow ${out ? "is-out" : ""}`} role="row">
                <span role="cell" className="a-vlabel">
                  {v.colorId && <span className="a-swatch" style={{ background: d.colors.find((c) => c.id === v.colorId)?.hex }} aria-hidden />}
                  {label}
                  {out && <em> · нет в наличии</em>}
                </span>
                <span role="cell">
                  <input inputMode="numeric" value={v.stock} aria-label={`Остаток: ${label}`} onChange={(e) => set("variants", d.variants.map((x) => (x.id === v.id ? { ...x, stock: e.target.value.replace(/\D/g, "") } : x)))} />
                </span>
                <span role="cell">
                  <input inputMode="decimal" value={v.price} placeholder={d.price || "—"} aria-label={`Своя цена: ${label}`} onChange={(e) => set("variants", d.variants.map((x) => (x.id === v.id ? { ...x, price: e.target.value } : x)))} />
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="a-card">
        <h2>Таблица размеров</h2>
        <Field label="Таблица (необязательно)" hint="Каждая строка — строка таблицы, ячейки разделяются символом |. Первая строка — заголовки.">
          <textarea rows={5} value={d.sizeChart} onChange={(e) => set("sizeChart", e.target.value)} className="a-mono" />
        </Field>
        {!d.sizeChart && <button type="button" className="a-text-btn" onClick={() => set("sizeChart", CHART_TEMPLATE)}>Вставить шаблон</button>}
      </section>

      <section className="a-card">
        <h2>Метки и публикация</h2>
        <Toggle label="Новинка" hint="Метка «New» и раздел «Новинки» на главной" checked={d.isNew} onChange={(v) => set("isNew", v)} />
        <Toggle label="Показывать на главной" hint="Раздел «Выбор MELEVI»" checked={d.isFeatured} onChange={(v) => set("isFeatured", v)} />
        <fieldset className="a-segment">
          <legend className="a-label">Статус</legend>
          {(["draft", "published", "hidden"] as const).map((s) => (
            <label key={s} className={d.status === s ? "active" : ""}>
              <input type="radio" name="status" value={s} checked={d.status === s} onChange={() => set("status", s)} />
              {{ draft: "Черновик", published: "Опубликован", hidden: "Скрыт" }[s]}
            </label>
          ))}
        </fieldset>
        <p className="a-hint">Черновик и скрытый товар видите только вы. Опубликованный — все покупатели.</p>
      </section>

      {product && (
        <section className="a-card a-card-danger">
          <h2>Удаление</h2>
          <p className="a-hint">Удаление нельзя отменить. Чтобы временно убрать товар, выберите статус «Скрыт».</p>
          <button type="button" className="a-btn a-btn-danger" onClick={remove}>Удалить товар</button>
        </section>
      )}

      <div className="a-savebar">
        {error ? <p className="a-error" role="alert">{error}</p> : <p className="a-hint">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</p>}
        <div className="a-savebar-actions">
          {!product && d.status !== "draft" && (
            <button type="button" className="a-btn" disabled={saving || !!uploading} onClick={() => save("draft")}>Сохранить черновик</button>
          )}
          <button type="submit" className="a-btn a-btn-primary" disabled={saving || !!uploading}>
            {saving ? "Сохраняем…" : uploading ? "Ждём загрузку фото…" : "Сохранить"}
          </button>
        </div>
      </div>
    </form>
  );
}
