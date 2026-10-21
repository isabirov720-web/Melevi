-- MELEVI catalog — initial schema.
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- Safe to re-run: objects are created only if missing.

create extension if not exists pgcrypto;

-- ---------- Owners ----------
-- Users listed here may modify the store. Add the owner after creating their login (see README).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name jsonb not null check (jsonb_typeof(name) = 'object'),
  position integer not null default 0,
  visible boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Products ----------
-- Colors, sizes, variants and images are stored as JSON arrays inside the product row, so a
-- product is always saved atomically. Every element carries its own stable UUID.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  category_id uuid references public.categories (id) on delete set null,
  name jsonb not null check (jsonb_typeof(name) = 'object'),
  description jsonb not null default '{"ru":"","en":""}',
  -- Prices are integers in minor units (cents).
  price integer not null check (price >= 0 and price <= 100000000),
  compare_at_price integer check (compare_at_price is null or (compare_at_price > price and compare_at_price <= 100000000)),
  colors jsonb not null default '[]' check (jsonb_typeof(colors) = 'array'),
  sizes jsonb not null default '[]' check (jsonb_typeof(sizes) = 'array'),
  variants jsonb not null default '[]' check (
    jsonb_typeof(variants) = 'array'
    and not jsonb_path_exists(variants, '$[*] ? (@.stock.type() != "number" || @.stock < 0 || @.stock > 100000 || @.price < 0)')
  ),
  images jsonb not null default '[]' check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 30),
  size_chart text not null default '',
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status, created_at desc);
create index if not exists products_category_idx on public.products (category_id);

-- ---------- Store settings (single row) ----------
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict do nothing;

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before insert or update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.store_settings;
create trigger settings_touch before update on public.store_settings for each row execute function public.touch_updated_at();

-- ---------- Row-Level Security ----------
alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "admins: read own row" on public.admins;
create policy "admins: read own row" on public.admins for select using (user_id = auth.uid());
-- No insert/update/delete policies: owners are added only via the SQL editor.

drop policy if exists "categories: public read visible" on public.categories;
create policy "categories: public read visible" on public.categories for select
  using (visible or public.is_admin());
drop policy if exists "categories: owner writes" on public.categories;
create policy "categories: owner writes" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- Customers see only published products whose category (if any) is visible.
drop policy if exists "products: public read published" on public.products;
create policy "products: public read published" on public.products for select
  using (
    public.is_admin()
    or (
      status = 'published'
      and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.visible))
    )
  );
drop policy if exists "products: owner writes" on public.products;
create policy "products: owner writes" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings: public read" on public.store_settings;
create policy "settings: public read" on public.store_settings for select using (true);
drop policy if exists "settings: owner writes" on public.store_settings;
create policy "settings: owner writes" on public.store_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Photo storage ----------
-- Public bucket: anyone can view photos by URL; only the owner can upload/replace/delete.
-- The bucket itself enforces a 5 MB limit and image-only MIME types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media: owner upload" on storage.objects;
create policy "media: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: owner update" on storage.objects;
create policy "media: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: owner delete" on storage.objects;
create policy "media: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: owner list" on storage.objects;
create policy "media: owner list" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
