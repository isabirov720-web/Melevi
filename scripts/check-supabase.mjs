// Checks the Supabase connection from .env.local WITHOUT printing any keys.
// Uses only the public (anon/publishable) key — exactly what visitors' browsers can use.
// Usage: npm run check:supabase
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };
if (existsSync(".env.local"))
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";
let failed = 0;
const ok = (m) => console.log(`✓ ${m}`);
const bad = (m, hint) => {
  failed++;
  console.log(`✗ ${m}${hint ? `\n   → ${hint}` : ""}`);
};

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  bad("NEXT_PUBLIC_SUPABASE_URL не задан или выглядит неверно", "Ожидается вид https://xxxx.supabase.co (Project Settings → API → Project URL)");
  process.exit(1);
}
ok(`адрес проекта: ${url.replace(/^https:\/\/([a-z0-9]{4})[a-z0-9-]*/, "https://$1…")}`);
if (!key) {
  bad("Публичный ключ не задан (NEXT_PUBLIC_SUPABASE_ANON_KEY или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  process.exit(1);
}
if (/service_role|sb_secret_/.test(key) || (key.startsWith("eyJ") && JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "service_role")) {
  bad("В NEXT_PUBLIC_SUPABASE_ANON_KEY вставлен СЕКРЕТНЫЙ ключ (service_role / secret)!", "Замените его на anon / publishable ключ. Секретный ключ нельзя хранить в .env.local и Vercel.");
  process.exit(1);
}
ok("ключ публичный (anon / publishable), не секретный");

const db = createClient(url, key, { auth: { persistSession: false } });

const s = await db.from("store_settings").select("id").eq("id", 1).maybeSingle();
if (s.error) bad(`таблицы не найдены (${s.error.message})`, "Выполните supabase/migrations/0001_init.sql в SQL Editor");
else if (!s.data) bad("строка настроек отсутствует", "Выполните миграцию ещё раз — она безопасна для повторного запуска");
else ok("миграция применена: таблицы и настройки на месте");

const p = await db.from("products").select("id", { count: "exact", head: true });
if (!p.error) ok(`опубликованных товаров, видимых покупателям: ${p.count ?? 0}`);

const ins = await db.from("products").insert({ slug: "security-check", name: { ru: "x" }, price: 1 });
if (ins.error) ok("посетитель не может добавлять товары (защита RLS работает)");
else {
  bad("ВНИМАНИЕ: анонимная запись разрешена — защита не работает!", "Проверьте, что миграция выполнена полностью");
  await db.from("products").delete().eq("slug", "security-check");
}
const upd = await db.from("store_settings").update({ data: {} }).eq("id", 1).select("id");
if (upd.error || !upd.data?.length) ok("посетитель не может менять настройки сайта");
else bad("ВНИМАНИЕ: анонимное изменение настроек разрешено!");

const up = await db.storage.from("media").upload(`check/${Date.now()}.png`, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" });
if (up.error) ok("посетитель не может загружать фото");
else bad("ВНИМАНИЕ: анонимная загрузка фото разрешена!");

const res = await fetch(`${url.replace(/\/$/, "")}/storage/v1/object/public/media/__check__.png`);
const body = await res.text();
if (/bucket not found/i.test(body)) bad("хранилище фото «media» не найдено", "Выполните миграцию (она создаёт хранилище)");
else ok("хранилище фото «media» существует и открыто для просмотра");

console.log(failed ? `\nПроблем: ${failed}` : "\nВсё готово. Владельца проверяем входом на /admin.");
process.exit(failed ? 1 : 0);
