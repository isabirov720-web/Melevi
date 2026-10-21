// Applies supabase/migrations/*.sql directly to the Supabase database from this computer,
// as a single transaction (all or nothing). Optionally makes an existing user the owner.
//
// The connection string is read from .env.db.local (never committed, never uploaded, never printed):
//   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
//
// Usage:
//   npm run db:migrate                         apply migrations + show status
//   npm run db:migrate -- --owner you@mail.com also grant owner rights to that user
//   npm run db:migrate -- --status             only show status
import { readFileSync, readdirSync, existsSync } from "node:fs";
import pg from "pg";

const FILE = ".env.db.local";
const raw = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";
const url = (process.env.SUPABASE_DB_URL || raw.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+?)\s*$/m)?.[1] || "").replace(/^["']|["']$/g, "");

if (!url || url.includes("[YOUR-PASSWORD]") || url.includes("ВСТАВЬТЕ")) {
  console.error(`✗ В файле ${FILE} нет строки подключения (или не заменён [YOUR-PASSWORD]).`);
  process.exit(1);
}
let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("✗ Строка подключения не распознана. Если в пароле есть символы @ : / ? # — смените пароль базы на пароль только из букв и цифр.");
  process.exit(1);
}
console.log(`Подключение к ${parsed.hostname} (пользователь ${parsed.username.replace(/\..*/, ".…")}, пароль скрыт)`);

const args = process.argv.slice(2);
const ownerEmail = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : null;
const statusOnly = args.includes("--status");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
} catch (e) {
  const msg = String(e.message);
  console.error("✗ Не удалось подключиться:", msg.replace(url, "<скрыто>"));
  if (/password authentication/i.test(msg)) console.error("  → Неверный пароль базы. Сбросьте его: Project Settings → Database → Reset database password.");
  if (/ENOTFOUND|EHOSTUNREACH|ENETUNREACH|timeout/i.test(msg)) console.error("  → Используйте строку «Session pooler» (порт 5432, адрес *.pooler.supabase.com), а не «Direct connection».");
  process.exit(1);
}

try {
  if (!statusOnly) {
    const dir = "supabase/migrations";
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
      await client.query(`begin;\n${readFileSync(`${dir}/${f}`, "utf8")}\ncommit;`).catch(async (e) => {
        await client.query("rollback").catch(() => {});
        throw new Error(`${f}: ${e.message}`);
      });
      console.log(`✓ Миграция применена: ${f}`);
    }
  }

  if (ownerEmail) {
    const u = await client.query("select id from auth.users where lower(email) = lower($1)", [ownerEmail]);
    if (!u.rows.length) {
      console.log(`✗ Пользователь ${ownerEmail} не найден. Создайте его: Authentication → Users → Add user.`);
      process.exitCode = 1;
    } else {
      await client.query("insert into public.admins (user_id) values ($1) on conflict do nothing", [u.rows[0].id]);
      console.log(`✓ ${ownerEmail} — владелец магазина`);
    }
  }

  const s = (
    await client.query(`select
      (select string_agg(tablename, ', ' order by tablename) from pg_tables where schemaname = 'public') as tables,
      (select count(*) from pg_policies where schemaname in ('public', 'storage') and (tablename in ('admins','categories','products','store_settings') or policyname like 'media:%'))::int as policies,
      (select public from storage.buckets where id = 'media') as bucket_public,
      (select count(*) from public.admins)::int as owners,
      (select count(*) from auth.users)::int as users,
      (select count(*) from public.products)::int as products`)
  ).rows[0];
  console.log("\nСостояние базы:");
  console.log(`  таблицы:            ${s.tables ?? "нет"}`);
  console.log(`  правила доступа:    ${s.policies} (ожидается 11)`);
  console.log(`  хранилище «media»:  ${s.bucket_public == null ? "нет" : s.bucket_public ? "есть, публичное" : "есть, НЕ публичное"}`);
  console.log(`  пользователей:      ${s.users}, из них владельцев: ${s.owners}`);
  console.log(`  товаров:            ${s.products}`);
} catch (e) {
  console.error("✗ Ошибка:", String(e.message).replace(url, "<скрыто>"));
  process.exitCode = 1;
} finally {
  await client.end();
}
