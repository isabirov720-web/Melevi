"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CURRENCIES } from "@/lib/format";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import type { Locale, StoreSettings } from "@/lib/types";
import { api, uploadImage } from "./client";
import { useFeedback } from "./Feedback";
import { Bilingual, Field, Toggle } from "./Fields";

function ImagePicker({
  label, hint, url, onChange, folderOpts,
}: {
  label: string; hint: string; url: string | null; onChange: (v: { url: string; path: string } | null) => void; folderOpts?: { maxSide?: number; keepAlpha?: boolean };
}) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, "site", folderOpts));
    } catch (e) {
      toast("error", (e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      <div className="a-imagepick">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        ) : (
          <span className="a-imagepick-empty">Не выбрано</span>
        )}
        <div className="a-stack-sm">
          <label className="a-btn a-btn-sm">
            {busy ? "Загрузка…" : url ? "Заменить" : "Загрузить"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {url && <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => onChange(null)}>Убрать</button>}
        </div>
      </div>
      <span className="a-hint">{hint}</span>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [s, setS] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const initial = useRef(JSON.stringify(settings));
  const dirty = JSON.stringify(s) !== initial.current;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const up = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const contact = <K extends keyof StoreSettings["contacts"]>(k: K, v: StoreSettings["contacts"][K]) => setS((p) => ({ ...p, contacts: { ...p.contacts, [k]: v } }));
  const policy = <K extends keyof StoreSettings["policies"]>(k: K, v: StoreSettings["policies"][K]) => setS((p) => ({ ...p, policies: { ...p.policies, [k]: v } }));
  const section = (k: keyof StoreSettings["sections"], v: boolean) => setS((p) => ({ ...p, sections: { ...p.sections, [k]: v } }));
  const color = (k: keyof StoreSettings["colors"], v: string) => setS((p) => ({ ...p, colors: { ...p.colors, [k]: v } }));
  const toggleLocale = (l: Locale, on: boolean) =>
    setS((p) => ({ ...p, enabledLocales: on ? [...new Set([...p.enabledLocales, l])] : p.enabledLocales.filter((x) => x !== l) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await api<{ settings: StoreSettings }>("/api/admin/settings", "PUT", s);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return toast("error", res.error);
    }
    initial.current = JSON.stringify(s);
    toast("ok", "Настройки сохранены — изменения уже на сайте");
    router.refresh();
  };

  const waMissing = s.orderChannels.whatsapp && s.contacts.whatsapp.replace(/\D/g, "").length < 7;
  const igMissing = s.orderChannels.instagram && !/instagram\.com\/[A-Za-z0-9._]+/.test(s.contacts.instagramUrl);

  return (
    <form className="a-editor" onSubmit={save} noValidate>
      <section className="a-card">
        <h2>Логотип и баннер</h2>
        <Field label="Название магазина" required>
          <input value={s.storeName} onChange={(e) => up("storeName", e.target.value)} maxLength={60} />
        </Field>
        <ImagePicker
          label="Логотип"
          hint="PNG с прозрачным фоном, по ширине ~600 px. Если не загружен — показывается текстовый логотип с названием магазина."
          url={s.logoUrl}
          folderOpts={{ maxSide: 800, keepAlpha: true }}
          onChange={(v) => setS((p) => ({ ...p, logoUrl: v?.url ?? null, logoPath: v?.path ?? null }))}
        />
        <ImagePicker
          label="Баннер на главной"
          hint="Горизонтальное фото, лучше 2000×1250 px. Важная часть кадра — по центру (на телефоне края обрезаются)."
          url={s.heroImageUrl}
          folderOpts={{ maxSide: 2400 }}
          onChange={(v) => setS((p) => ({ ...p, heroImageUrl: v?.url ?? null, heroImagePath: v?.path ?? null }))}
        />
        <Bilingual label="Заголовок баннера" value={s.heroHeadline} onChange={(v) => up("heroHeadline", v)} maxLength={120} />
        <Bilingual label="Подзаголовок" value={s.heroSubtitle} onChange={(v) => up("heroSubtitle", v)} maxLength={240} />
      </section>

      <section className="a-card">
        <h2>Разделы главной страницы</h2>
        <p className="a-hint">Пустые разделы скрываются автоматически.</p>
        <Toggle label="Категории" checked={s.sections.categories} onChange={(v) => section("categories", v)} />
        <Toggle label="Новинки" checked={s.sections.newArrivals} onChange={(v) => section("newArrivals", v)} />
        <Toggle label="Избранное («Выбор MELEVI»)" checked={s.sections.featured} onChange={(v) => section("featured", v)} />
        <Toggle label="О магазине" checked={s.sections.about} onChange={(v) => section("about", v)} />
        <Toggle label="Instagram" checked={s.sections.instagram} onChange={(v) => section("instagram", v)} />
      </section>

      <section className="a-card">
        <h2>О магазине</h2>
        <Bilingual label="Заголовок" value={s.aboutTitle} onChange={(v) => up("aboutTitle", v)} maxLength={120} />
        <Bilingual label="Текст" value={s.aboutText} onChange={(v) => up("aboutText", v)} multiline rows={6} maxLength={4000} hint="Пустая строка = новый абзац. На главной показываются первые два абзаца." />
      </section>

      <section className="a-card">
        <h2>Контакты</h2>
        <Field label="WhatsApp для заявок" hint="С кодом страны, например +996 555 123 456. Покупатель отправит заявку на этот номер.">
          <input type="tel" inputMode="tel" value={s.contacts.whatsapp} onChange={(e) => contact("whatsapp", e.target.value)} placeholder="+996 …" />
        </Field>
        <div className="a-grid2">
          <Field label="Телефон"><input type="tel" inputMode="tel" value={s.contacts.phone} onChange={(e) => contact("phone", e.target.value)} placeholder="Необязательно" /></Field>
          <Field label="Email"><input type="email" value={s.contacts.email} onChange={(e) => contact("email", e.target.value)} placeholder="Необязательно" /></Field>
        </div>
        <Bilingual label="Город" value={s.contacts.city} onChange={(v) => contact("city", v)} maxLength={80} />
        <Bilingual label="Адрес шоурума / пункта выдачи" value={s.contacts.address} onChange={(v) => contact("address", v)} maxLength={300} hint="Оставьте пустым, если адреса нет." />
        <Field label="Instagram (ссылка)"><input type="url" value={s.contacts.instagramUrl} onChange={(e) => contact("instagramUrl", e.target.value)} placeholder="https://www.instagram.com/…" /></Field>
        <div className="a-grid2">
          <Field label="Telegram (ссылка)"><input type="url" value={s.contacts.telegramUrl} onChange={(e) => contact("telegramUrl", e.target.value)} placeholder="https://t.me/…" /></Field>
          <Field label="Threads (ссылка)"><input type="url" value={s.contacts.threadsUrl} onChange={(e) => contact("threadsUrl", e.target.value)} placeholder="https://www.threads.net/@…" /></Field>
        </div>
      </section>

      <section className="a-card">
        <h2>Как покупатели отправляют заявки</h2>
        <Toggle label="WhatsApp" hint="Готовое сообщение с товарами откроется в WhatsApp покупателя" checked={s.orderChannels.whatsapp} onChange={(v) => up("orderChannels", { ...s.orderChannels, whatsapp: v })} />
        {waMissing && <p className="a-warn">Кнопка WhatsApp не появится, пока не указан номер WhatsApp выше.</p>}
        <Toggle label="Instagram" hint="Текст заявки копируется, и открывается Direct магазина" checked={s.orderChannels.instagram} onChange={(v) => up("orderChannels", { ...s.orderChannels, instagram: v })} />
        {igMissing && <p className="a-warn">Укажите ссылку на Instagram в контактах.</p>}
      </section>

      <section className="a-card">
        <h2>Доставка, обмен и возврат</h2>
        <p className="a-hint">Пишите только то, что магазин действительно гарантирует. Пустые пункты на сайте не показываются.</p>
        <Bilingual label="Доставка" value={s.policies.delivery} onChange={(v) => policy("delivery", v)} multiline maxLength={3000} />
        <Bilingual label="Обмен" value={s.policies.exchange} onChange={(v) => policy("exchange", v)} multiline maxLength={3000} />
        <Bilingual label="Возврат" value={s.policies.returns} onChange={(v) => policy("returns", v)} multiline maxLength={3000} />
        <Toggle label="Доставка оплачивается отдельно" hint="Рядом с итоговой суммой в корзине появится пометка" checked={s.policies.deliveryChargedSeparately} onChange={(v) => policy("deliveryChargedSeparately", v)} />
      </section>

      <section className="a-card">
        <h2>Валюта и язык</h2>
        <Field label="Валюта" hint="Смена валюты не пересчитывает цены — при необходимости обновите цены товаров вручную.">
          <select value={s.currency} onChange={(e) => up("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>
        <fieldset className="a-bilingual">
          <legend className="a-label">Языки сайта для покупателей</legend>
          <label className="a-check"><input type="checkbox" checked={s.enabledLocales.includes("ru")} onChange={(e) => toggleLocale("ru", e.target.checked)} /> Русский</label>
          <label className="a-check"><input type="checkbox" checked={s.enabledLocales.includes("en")} onChange={(e) => toggleLocale("en", e.target.checked)} /> English</label>
        </fieldset>
        <Field label="Язык по умолчанию">
          <select value={s.defaultLocale} onChange={(e) => up("defaultLocale", e.target.value as Locale)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </Field>
      </section>

      <section className="a-card">
        <h2>Цвета бренда</h2>
        <div className="a-colors-grid">
          {([["primary", "Основной (текст, кнопки)"], ["accent", "Акцент (скидки, детали)"], ["background", "Фон"]] as const).map(([k, label]) => (
            <label key={k} className="a-colorpick">
              <input type="color" value={s.colors[k]} onChange={(e) => color(k, e.target.value)} />
              <span>{label}<code>{s.colors[k]}</code></span>
            </label>
          ))}
        </div>
        <div className="a-preview" style={{ background: s.colors.background, color: s.colors.primary }}>
          <strong style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: ".3em" }}>{s.storeName.toUpperCase()}</strong>
          <span style={{ background: s.colors.primary, color: s.colors.background }} className="a-preview-btn">Кнопка</span>
          <span style={{ background: s.colors.accent, color: "#fff" }} className="a-preview-btn">Sale</span>
        </div>
        <button type="button" className="a-text-btn" onClick={() => up("colors", DEFAULT_SETTINGS.colors)}>Вернуть стандартные цвета</button>
      </section>

      <div className="a-savebar">
        {error ? <p className="a-error" role="alert">{error}</p> : <p className="a-hint">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</p>}
        <div className="a-savebar-actions">
          <button type="submit" className="a-btn a-btn-primary" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить настройки"}</button>
        </div>
      </div>
    </form>
  );
}
