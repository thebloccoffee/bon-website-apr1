-- Digital shop schema (LUTs, presets, travel guides)
-- Run in: supabase.com -> your project -> SQL Editor -> paste -> Run
--
-- Security model:
--   shop_products       public read (published only)  <- safe, marketing copy
--   shop_product_files  NO public policy              <- storage paths, service role only
--   shop_orders         NO public policy              <- customer PII, service role only
--   shop_grants         NO public policy              <- download tokens, service role only
-- RLS on + zero policies = deny all. Only the service_role key (server-side,
-- never in the browser bundle) bypasses RLS. Do not add anon policies to the
-- bottom three tables.

create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  category text default 'lut',           -- lut | preset | guide | bundle
  price_formatted text,                   -- display only, e.g. "$29" — LS is the real price
  cover_image text,
  gallery text[],
  before_image text,                      -- LUT/preset before-after slider
  after_image text,
  features text[],                        -- "12 .cube files", "Rec.709 + LOG", ...
  ls_variant_id text,                     -- Lemon Squeezy variant id
  ls_buy_url text,                        -- https://STORE.lemonsqueezy.com/buy/VARIANT_UUID
  status text default 'published',
  "order" integer default 0
);

-- Files delivered on purchase. Paths point into the PRIVATE storage bucket.
create table if not exists shop_product_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  product_id uuid references shop_products(id) on delete cascade,
  label text not null,                    -- "Jon Bon Travel LUTs v2 (.zip)"
  storage_path text not null,             -- "luts/travel-v2.zip" inside bucket shop-files
  size_label text
);

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  ls_order_id text not null unique,       -- webhook data.id — dedupes retries
  identifier text not null,               -- LS order uuid, used as the receipt key
  order_number integer,
  email text,
  name text,
  total_cents integer,
  currency text,
  status text,
  variant_id text,
  product_id uuid references shop_products(id),
  test_mode boolean default false,
  raw jsonb
);

create index if not exists shop_orders_identifier_idx on shop_orders(identifier);

create table if not exists shop_grants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  token text not null unique,             -- 32-byte random, the download bearer
  order_id uuid references shop_orders(id) on delete cascade,
  file_id uuid references shop_product_files(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer default 15,
  used_count integer default 0
);

create index if not exists shop_grants_token_idx on shop_grants(token);

alter table shop_products      enable row level security;
alter table shop_product_files enable row level security;
alter table shop_orders        enable row level security;
alter table shop_grants        enable row level security;

-- The ONLY public policy in this file.
drop policy if exists "Public can read published products" on shop_products;
create policy "Public can read published products"
  on shop_products for select
  using (status = 'published');

-- shop_product_files, shop_orders, shop_grants: intentionally no policies.

-- Private storage bucket for the actual deliverables.
insert into storage.buckets (id, name, public)
values ('shop-files', 'shop-files', false)
on conflict (id) do update set public = false;
-- No storage policies either: only the service role signs URLs for this bucket.
