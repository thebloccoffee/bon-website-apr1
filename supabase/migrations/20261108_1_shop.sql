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
  price_formatted text,                   -- display only, e.g. "$29" — Stripe holds the real price
  cover_image text,
  gallery text[],
  before_image text,                      -- LUT/preset before-after slider
  after_image text,
  features text[],                        -- "12 .cube files", "Rec.709 + LOG", ...
  stripe_price_id text,                   -- price_1ABC... — what the webhook matches on
  checkout_url text,                      -- https://buy.stripe.com/... (Payment Link)
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
  stripe_session_id text not null unique, -- cs_live_... — dedupes webhook retries
  payment_intent text,                    -- pi_... — how refunds find the order
  identifier text,                        -- spare bearer key, not currently used
  order_number text,                      -- short human-readable code
  email text,
  name text,
  total_cents integer,
  currency text,
  status text,
  price_id text,
  product_id uuid references shop_products(id),
  test_mode boolean default false,
  raw jsonb
);

create index if not exists shop_orders_session_idx on shop_orders(stripe_session_id);
create index if not exists shop_orders_intent_idx  on shop_orders(payment_intent);

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

-- ---------------------------------------------------------------------------
-- Migration, only if you already ran an earlier Lemon Squeezy version of this
-- file. Safe to run on a fresh database: every branch is guarded.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='shop_products' and column_name='ls_variant_id') then
    alter table shop_products rename column ls_variant_id to stripe_price_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name='shop_products' and column_name='ls_buy_url') then
    alter table shop_products rename column ls_buy_url to checkout_url;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name='shop_orders' and column_name='ls_order_id') then
    alter table shop_orders rename column ls_order_id to stripe_session_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name='shop_orders' and column_name='variant_id') then
    alter table shop_orders rename column variant_id to price_id;
  end if;

  alter table shop_orders add column if not exists payment_intent text;
  -- order_number was an LS integer; Stripe codes are alphanumeric.
  alter table shop_orders alter column order_number type text using order_number::text;
  alter table shop_orders alter column identifier drop not null;
end $$;
