# MELEVI — catalog website

A clothing catalog for the MELEVI Instagram store. Customers browse products, choose color and size, and send an **order request** via WhatsApp or Instagram. Online payment isn't built in yet. The owner manages everything in a Russian-language admin panel at `/admin`.

- Owner guide (in Russian): [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md)

## How it works

```
Customer's phone ──► Next.js website (Cloudflare Workers) ──► Supabase
                      • storefront pages             • Postgres database (products, categories, settings)
                      • /admin panel                  • Storage bucket "media" (photos)
                      • API routes (validation)       • Auth (owner login) + Row-Level Security
Cart ──► stays in the customer's browser (localStorage) — no personal data is collected
Order request ──► customer sends it themselves in WhatsApp / Instagram Direct
```

- **Next.js 16 + TypeScript**, deployed to **Cloudflare Workers** with the OpenNext adapter (`@opennextjs/cloudflare`): the website and admin panel. Pages are rendered on the server for every request, so price changes show up immediately.
- **Supabase**: the database, photo storage and owner login. **Row-Level Security** rules in the database mean:
  - anyone can read only *published* products in *visible* categories;
  - only users listed in the `admins` table can change products, categories, settings or photos.
- **All admin saves go through server API routes** (`app/api/admin/*`). They check the owner session, the request origin, and the data itself (Zod schemas in `lib/schema.ts`: prices, stock, sizes, URLs). Uploads are checked by file type (by content, not just the name) and by size (max 5 MB). Photos are also resized in the browser before upload.
- **Two backends with the same code** (`lib/repo/`):
  - `supabase`: production. Used automatically when the Supabase env variables are set.
  - `local`: development/demo. Stores data in `.data/db.json` and photos in `.data/uploads/`, with a password-only login. It's shared by everyone using that server, but **it can't be used on Cloudflare Workers or Vercel** (no persistent disk). The site refuses to start in this mode there.

## Project structure

```
app/
  (store)/            storefront: home, catalog, product/[slug], cart, about, 404
  admin/              admin panel (login, products, categories, settings, backup)
  api/admin/*         owner-only API (products, categories, settings, upload, export, demo cleanup)
  api/cart            returns current prices/stock for cart items
  api/media/*         serves photos in local mode
components/store/     storefront UI (gallery, product options, catalog filters, cart)
components/admin/     admin UI (product editor, category manager, settings form)
lib/
  types.ts            data model
  schema.ts           server-side validation
  catalog.ts          variant/stock logic      filters.ts  search & filters
  order.ts            order-request text, WhatsApp/Instagram links
  i18n.ts             customer-facing texts (RU/EN)
  auth.ts             owner authentication & authorization
  repo/               data access: supabase.ts (production), local.ts (dev)
supabase/migrations/  database schema, security rules, storage bucket
data/demo.json        DEMO products (clearly labeled, removable)
scripts/e2e.mjs       end-to-end checks; scripts/seed-supabase.mjs loads demo data
tests/                unit tests
```

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local     # set ADMIN_PASSWORD (8+ characters)
npm run dev                    # http://localhost:3000, admin: http://localhost:3000/admin
```

Without Supabase variables the site runs in **local mode** with labeled demo products.

Checks:

```bash
npm run typecheck
npm test                       # unit tests: variants, filters, totals, order text, validation
npm run build && npm start     # in one terminal
npm run e2e                    # in another: owner/customer scenarios against the running site
```

## Production setup

### 1. Supabase (database, photo storage, owner account)

1. Create a free project at <https://supabase.com>. Choose a region close to your customers (e.g. Frankfurt).
2. **SQL Editor → New query**: paste all of `supabase/migrations/0001_init.sql` and click **Run**. This creates the tables, security rules and the `media` photo bucket (public read, 5 MB limit, images only).
3. **Authentication → Users → Add user → Create new user**: enter the owner's email and a strong password, and tick **Auto Confirm User**.
4. **Make that user the owner.** In the SQL Editor run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
5. **Authentication → Sign In / Providers → Email**: turn off **Allow new users to sign up**, so nobody else can create accounts. They still couldn't edit anything, but it's tidier.
6. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key.
7. Optional: to load the demo catalog, run this on your computer:
   `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed:supabase`
   The service key is a full-access secret. Use it only in this one command, and never put it in Cloudflare or a `.env` file you share.

### 2. Deploy on Cloudflare Workers (auto-deploy from GitHub)

The adapter config lives in `wrangler.jsonc` (Worker name `melevi`) and `open-next.config.ts`.

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository**, then pick `isabirov720-web/Melevi`, branch `master`.
2. Build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
   - **Non-production branch deploy command:** `npx opennextjs-cloudflare upload`
   - **Root directory:** `/`
3. **Build variables** (Settings → Build → Variables and secrets). They're needed at *build* time because `NEXT_PUBLIC_*` values are baked into the code:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public anon/publishable key, never the secret key)
   - `NEXT_PUBLIC_SITE_URL` (for example `https://melevi.<account>.workers.dev`, later your domain)
4. Add the same three as **runtime variables** (Settings → Variables and secrets, type *Text*).
5. Save and deploy. Every push to `master` then deploys automatically.

Local checks before pushing:

```bash
npm run build      # Next.js build
npm run preview    # build for Workers and run it locally in workerd at http://localhost:8787
```

Changes saved in the admin panel live in Supabase, so they survive page reloads and redeployments and are visible to every customer.

### 3. Custom domain

1. Add the domain to Cloudflare (**Websites → Add a site**) and switch the registrar's nameservers to the two Cloudflare shows.
2. Worker `melevi` → **Settings → Domains & Routes → Add → Custom domain**, then enter `melevi.kg` (and `www.melevi.kg`). HTTPS is set up automatically.
3. Update `NEXT_PUBLIC_SITE_URL` (build and runtime variables) to the new domain and redeploy.
4. Put the link in the Instagram bio.

## Backup and export

- **From the admin panel:** **Копия → Полная копия (JSON)** downloads all products, categories and settings. **Таблица для Excel (CSV)** downloads one row per color/size with price and stock. Do this weekly and before big changes.
- **Full database backup:** Supabase Pro has daily backups. On the free plan, run `pg_dump` with the connection string from **Project Settings → Database**:
  `pg_dump "postgresql://…" --schema=public > melevi-db.sql`
- **Photos:** in **Storage → media** you can download files. Alternatively, `supabase storage cp -r ss:///media ./media-backup` with the Supabase CLI.
- **Local mode:** copy the `.data/` folder.

## Removing demo data before launch

Every demo product and category is marked `isDemo` and shows a yellow **«Демо»** badge. In the admin panel, open **Копия → Удалить демо-данные**. This deletes only demo records and the demo banner. Placeholder texts like `[Заполните этот текст…]` in **Сайт → О магазине** need to be replaced by hand.

## Not connected yet

| Feature | Status | What's needed |
|---|---|---|
| Supabase database, photo storage, owner login | Connected; migration applied; public access checks pass (`npm run check:supabase`) | — |
| WhatsApp order requests | Built; the button stays hidden until a number is entered | **Сайт → Контакты → WhatsApp** |
| Instagram order requests | Working: copies the request text and opens `ig.me/m/melevi.official` (Instagram Direct) | — |
| Phone, email, address, exchange and return policies | Empty: nothing has been made up | Fill in under **Сайт** |
| Real logo, banner and product photos | Text logo and labeled DEMO placeholders for now | Upload in the admin panel |
| Online payment | Not part of version 1 | Could be added later (e.g. a local payment provider) |
| Production hosting and domain | Configured for Cloudflare Workers, not yet deployed | Steps 2–3 above |
