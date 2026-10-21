"use client";

import type { ReactNode } from "react";
import type { LocalizedText } from "@/lib/types";

export function Field({ label, hint, children, required }: { label: string; hint?: ReactNode; children: ReactNode; required?: boolean }) {
  return (
    <label className="a-field">
      <span className="a-label">{label}{required && <span className="req" aria-hidden> *</span>}</span>
      {children}
      {hint && <span className="a-hint">{hint}</span>}
    </label>
  );
}

/** One field in two languages (RU required where noted, EN optional — falls back to RU on the site). */
export function Bilingual({
  label, value, onChange, multiline = false, rows = 4, required = false, hint, maxLength,
}: {
  label: string; value: LocalizedText; onChange: (v: LocalizedText) => void; multiline?: boolean; rows?: number; required?: boolean; hint?: string; maxLength?: number;
}) {
  const input = (lang: "ru" | "en") => {
    const common = {
      value: value[lang],
      onChange: (e: { target: { value: string } }) => onChange({ ...value, [lang]: e.target.value }),
      maxLength,
      lang,
      required: required && lang === "ru",
    };
    return multiline ? <textarea {...common} rows={rows} /> : <input type="text" {...common} />;
  };
  return (
    <fieldset className="a-bilingual">
      <legend className="a-label">{label}{required && <span className="req" aria-hidden> *</span>}</legend>
      <label className="a-lang"><span>RU</span>{input("ru")}</label>
      <label className="a-lang"><span>EN</span>{input("en")}</label>
      <span className="a-hint">{hint ?? "Если английский текст не заполнен, на английской версии сайта будет показан русский."}</span>
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="a-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="a-switch" aria-hidden />
      <span>
        {label}
        {hint && <span className="a-hint block">{hint}</span>}
      </span>
    </label>
  );
}
