-- ============================================================================
-- HUB SCHEMA (Phase 1)
-- Run AFTER supabase-migration-rls-lockdown.sql and 20261108_1_shop.sql.
-- Supabase Dashboard → SQL Editor → paste → Run. Safe to re-run.
--
-- Adds: brand on blog_posts, videos, shop_products extras, email_signups,
--       full-text search columns + search_site() RPC.
-- Every table has RLS on. Public can only read published rows.
-- All writes go through /api/* functions using the service_role key.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Brand values used everywhere
-- ---------------------------------------------------------------------------
-- Two brands only:
-- 'jooonbon'  Travel Filmmaker (default; the 30 existing journal posts land here)
-- 'bonpoints' Credit cards, finance and travel tips
-- Places/destinations are a shared topic (tags, destination), not a brand.

-- ---------------------------------------------------------------------------
-- 1. blog_posts: brand + kind + search
-- ---------------------------------------------------------------------------
alter table blog_posts add column if not exists brand text not null default 'jooonbon';
alter table blog_posts add column if not exists kind  text not null default 'story';  -- story | guide
alter table blog_posts add column if not exists updated_at timestamptz default now();

do $$ begin
  alter table blog_posts add constraint blog_posts_brand_chk check (brand in ('jooonbon','bonpoints'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table blog_posts add constraint blog_posts_kind_chk check (kind in ('story','guide'));
exception when duplicate_object then null; end $$;

alter table blog_posts add column if not exists search tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(excerpt, '') || ' ' || coalesce(location, '') || ' ' || coalesce(city, '')), 'B') ||
  setweight(to_tsvector('english', regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g')), 'D')
) stored;
create index if not exists blog_posts_search_idx on blog_posts using gin (search);
create index if not exists blog_posts_tags_idx   on blog_posts using gin (tags);
create index if not exists blog_posts_brand_idx  on blog_posts (brand, status);

-- ---------------------------------------------------------------------------
-- 2. videos (YouTube-hosted)
-- ---------------------------------------------------------------------------
create table if not exists videos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  youtube_id    text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  slug          text not null unique,
  title         text not null,
  description   text,
  brand         text not null default 'jooonbon' check (brand in ('jooonbon','bonpoints')),
  format        text not null default 'long' check (format in ('long','short')),
  tags          text[] default '{}',
  destination   text,                       -- destinations.slug, loose link
  published_at  timestamptz,
  duration_sec  integer,
  featured      boolean default false,
  status        text not null default 'published' check (status in ('draft','published')),
  "order"       integer default 0,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored
);
create index if not exists videos_search_idx on videos using gin (search);
create index if not exists videos_tags_idx   on videos using gin (tags);
create index if not exists videos_brand_idx  on videos (brand, status, published_at desc);

-- ---------------------------------------------------------------------------
-- 3. shop_products (created by 20261108_1_shop.sql, the Stripe shop).
--    Add brand, FAQ, featured flag and search. Checkout = Stripe Payment Link.
-- ---------------------------------------------------------------------------
alter table shop_products add column if not exists brand    text not null default 'jooonbon';
alter table shop_products add column if not exists faq      jsonb default '[]';   -- [{ "q": "...", "a": "..." }]
alter table shop_products add column if not exists featured boolean default false;
do $$ begin
  alter table shop_products add constraint shop_products_brand_chk check (brand in ('jooonbon','bonpoints'));
exception when duplicate_object then null; end $$;
-- New products start hidden until Jon publishes them.
alter table shop_products alter column status set default 'draft';
alter table shop_products add column if not exists search tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(subtitle, '') || ' ' || coalesce(description, '')), 'B')
) stored;
create index if not exists shop_products_search_idx on shop_products using gin (search);

-- ---------------------------------------------------------------------------
-- 4. email_signups (CASL: explicit consent recorded with wording + time)
--    No public policies at all: the form posts to /api/subscribe, which
--    rate-limits, checks a honeypot and inserts with the service_role key.
-- ---------------------------------------------------------------------------
create table if not exists email_signups (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  brand            text not null default 'jooonbon' check (brand in ('jooonbon','bonpoints')),
  source           text,                    -- page or lead magnet, e.g. 'bonpoints-mr-cheat-sheet'
  consent          boolean not null check (consent),
  consent_text     text not null,           -- exact checkbox wording shown
  consent_at       timestamptz not null default now(),
  unsubscribed_at  timestamptz
);
create unique index if not exists email_signups_email_brand_uq on email_signups (lower(email), brand);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table videos        enable row level security;
alter table email_signups enable row level security;

drop policy if exists "Public can read published videos" on videos;
create policy "Public can read published videos"
  on videos for select using (status = 'published');

-- email_signups: intentionally no policies (service_role only).

-- ---------------------------------------------------------------------------
-- 6. Site search RPC. security invoker, so RLS above still applies.
--    Call: supabase.rpc('search_site', { q: 'xiamen layover', brand_filter: null })
-- ---------------------------------------------------------------------------
create or replace function search_site(q text, brand_filter text default null, max_results int default 30)
returns table (kind text, slug text, title text, summary text, image text, brand text, rank real)
language sql stable security invoker
set search_path = public
as $$
  with query as (select websearch_to_tsquery('english', q) as tsq)
  select * from (
    select 'post'::text, p.slug, p.title, p.excerpt, p.cover_image, p.brand, ts_rank(p.search, query.tsq)
      from blog_posts p, query
     where p.status = 'published' and p.search @@ query.tsq
    union all
    select 'video', v.slug, v.title, v.description,
           'https://i.ytimg.com/vi/' || v.youtube_id || '/hqdefault.jpg', v.brand, ts_rank(v.search, query.tsq)
      from videos v, query
     where v.status = 'published' and v.search @@ query.tsq
    union all
    select 'product', pr.slug, pr.title, pr.subtitle, pr.cover_image, pr.brand, ts_rank(pr.search, query.tsq)
      from shop_products pr, query
     where pr.status = 'published' and pr.search @@ query.tsq
  ) r(kind, slug, title, summary, image, brand, rank)
  where brand_filter is null or r.brand = brand_filter
  order by r.rank desc
  limit least(max_results, 50);
$$;

grant execute on function search_site(text, text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verify:
--   select tablename, policyname, cmd from pg_policies where schemaname='public' order by 1,2;
--   select * from search_site('vancouver');
-- ---------------------------------------------------------------------------
