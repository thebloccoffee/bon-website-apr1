
-- ===== supabase-migration-rls-lockdown.sql =====
-- ============================================================================
-- RLS LOCKDOWN MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → paste → Run
--
-- What this does:
--   1. Adds the `city` column to blog_posts (idempotent, from PR #3).
--   2. Drops every "anon can do everything" policy. After this, the anon key
--      can ONLY do what the public site needs:
--        - SELECT published blog_posts
--        - SELECT portfolio_projects (all rows; the app filters status itself)
--        - SELECT published destinations
--        - INSERT contact_inquiries (the public contact form writes here)
--   3. Admin writes now go through /api/admin-* serverless functions, which
--      verify the admin session cookie and use the SERVICE_ROLE key
--      (service_role bypasses RLS, so no extra policies are needed for it).
--
-- IMPORTANT: this does NOT touch storage policies (bucket `media`).
-- See the STORAGE section at the bottom for what to check in the Dashboard.
-- ============================================================================

-- 0. city column (safe to re-run)
alter table blog_posts add column if not exists city text;

-- ----------------------------------------------------------------------------
-- 1. blog_posts
-- ----------------------------------------------------------------------------
drop policy if exists "Anon can manage blog posts" on blog_posts;
drop policy if exists "Public can read published posts" on blog_posts;

create policy "Public can read published posts"
  on blog_posts for select
  using (status = 'published');

-- ----------------------------------------------------------------------------
-- 2. portfolio_projects
--    NOTE: public SELECT stays open (using = true) because the app queries
--    with `.or('status.eq.published,status.is.null')` and the status column
--    is managed outside this migration. Tighten later if a status column
--    with a strict published/draft split is confirmed.
-- ----------------------------------------------------------------------------
drop policy if exists "Anon can manage portfolio" on portfolio_projects;
drop policy if exists "Public can read portfolio" on portfolio_projects;

create policy "Public can read portfolio"
  on portfolio_projects for select
  using (true);

-- ----------------------------------------------------------------------------
-- 3. destinations
-- ----------------------------------------------------------------------------
drop policy if exists "Anon can manage destinations" on destinations;
drop policy if exists "Public can read published destinations" on destinations;

create policy "Public can read published destinations"
  on destinations for select
  using (status = 'published');

-- ----------------------------------------------------------------------------
-- 4. contact_inquiries
--    - Public (anon) can ONLY insert (the contact form needs this).
--    - The old "Anon can read inquiries" policy is DROPPED: previously anyone
--      could read every contact-form submission. Reads now require the
--      service_role key (used by the /api/admin-* functions).
-- ----------------------------------------------------------------------------
drop policy if exists "Anon can read inquiries" on contact_inquiries;
drop policy if exists "Public can submit contact" on contact_inquiries;

create policy "Public can submit contact"
  on contact_inquiries for insert
  with check (true);

-- ----------------------------------------------------------------------------
-- 5. STORAGE (bucket: media) — MANUAL CHECK IN DASHBOARD
-- ----------------------------------------------------------------------------
-- Storage policies are not managed here because their current names are
-- unknown (created via Dashboard). After deploying the /api/admin-upload
-- change, verify in:
--   Supabase Dashboard → Storage → media bucket → Policies
--
-- Required end state:
--   ✅ Public READ stays open (images are served via public URLs on the site).
--      Keep/ensure a policy like:  FOR SELECT USING (bucket_id = 'media')
--   ❌ REMOVE any anon INSERT / UPDATE / DELETE policies on the bucket.
--      Uploads now go through POST /api/admin-upload, which mints a
--      short-lived signed URL using the service_role key after verifying
--      the admin session cookie.
--
-- To inspect current storage policies, run:
--   select policyname, cmd
--   from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
-- ============================================================================

-- Verification queries (run after the migration):
--   select tablename, policyname, cmd
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
--
-- Expected: each table has ONLY the policies created above, nothing with
-- "Anon can manage" or "Anon can read inquiries".

-- ===== supabase/migrations/20261108_1_shop.sql =====
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

-- ===== supabase/migrations/20261108_2_hub_schema.sql =====
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

-- ===== supabase/seed/videos.sql =====
-- Generated by scripts/fetch-youtube.mjs on 2026-11-09T05:20:41.881Z
-- Seeds public.videos. Safe to re-run: existing youtube_id rows are left alone.
-- Requires supabase/migrations/20261108_2_hub_schema.sql.
-- Rows: 120 (119 jooonbon, 1 bonpoints; 92 shorts)

begin;

insert into videos (youtube_id, slug, title, description, brand, format, tags, published_at, duration_sec, featured, status)
select v.* from (values
  ('ADpqsn9RiWk', 'scenes-from-wells-gray-provincial-park', 'Scenes from Wells Gray Provincial Park', null, 'jooonbon', 'short', '{}'::text[], '2026-10-12T10:11:39-07:00'::timestamptz, 12, false, 'published'),
  ('H7GZRNfqV1k', 'this-hike-is-voted-one-of-the-best-hikes-in-the-world', 'This hike is voted one of the best hikes in the world', null, 'jooonbon', 'short', '{}'::text[], '2026-10-12T09:01:35-07:00'::timestamptz, 22, false, 'published'),
  ('pEs9KXnDzfc', 'must-try-boat-tour-in-vancouver', 'Must try boat tour in Vancouver', null, 'jooonbon', 'short', '{}'::text[], '2026-07-07T12:42:56-07:00'::timestamptz, 16, false, 'published'),
  ('0VC05SMMjG8', 'must-have-accessory-for-mobile-filmmakers-acasis-official', 'Must have accessory for mobile filmmakers!  @Acasis Official', null, 'jooonbon', 'short', '{}'::text[], '2026-07-06T20:55:25-07:00'::timestamptz, 58, false, 'published'),
  ('JFWy_TrgGas', 'aftermath-of-the-vancouver-fireworks-travel-vancouver', 'aftermath of the Vancouver fireworks... #travel #vancouver', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-31T09:00:05-07:00'::timestamptz, 32, false, 'published'),
  ('89cCSkCefgI', 'cat-cat-village-in-vietnam', 'Cat Cat Village in Vietnam', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-30T21:00:04-07:00'::timestamptz, 22, false, 'published'),
  ('Sbv4VWY5LS8', 'cat-cat-village-left-me-speechless-vietnam-travel-beautiful', 'Cat Cat Village Left Me Speechless #vietnam #travel #beautiful', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-30T09:00:05-07:00'::timestamptz, 23, false, 'published'),
  ('xdazNh5htzw', '24hrs-in-manila-travel-manila-binondo', '24hrs in Manila #travel #manila #binondo', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-29T09:00:18-07:00'::timestamptz, 24, false, 'published'),
  ('4qdPLpnyAYs', 'why-are-the-cats-so-big-at-this-cafe-china-viral', 'Why are the cats so BIG at this cafe 😱 #china #viral', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-29T09:00:04-07:00'::timestamptz, 14, false, 'published'),
  ('97SBA5n-SEE', 'still-thinking-about-this-line-from-the-curious-case-of-benjamin-button', 'still thinking about this line from “The Curious Case of Benjamin Button”', null, 'jooonbon', 'short', '{}'::text[], '2026-05-28T17:44:34-07:00'::timestamptz, 22, false, 'published'),
  ('LIGQ2fdL4qg', 'this-is-what-summer-feels-like-in-the-philippines-travelgram-beachday', 'this is what summer feels like in the PHILIPPINES #travelgram #beachday', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-28T09:00:09-07:00'::timestamptz, 17, false, 'published'),
  ('3pu5Zj7nfDU', 'inside-cabana-vancouver-s-artist-takeover-nightlife-vancouver-clublife', 'Inside Cabana Vancouver''s Artist Takeover #nightlife #vancouver #clublife', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-27T21:00:00-07:00'::timestamptz, 65, false, 'published'),
  ('nWUBh8OWS-M', 'china-hotels-be-like-luxury-cinematic-filmmaker', 'China hotels be like #luxury #cinematic #filmmaker', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-27T09:00:17-07:00'::timestamptz, 13, false, 'published'),
  ('F3ZXv9Ser7w', 'you-need-to-visit-this-island-1hr-from-vancouver-travel', 'You need to visit this island... (1hr from Vancouver)  #travel', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-26T21:00:08-07:00'::timestamptz, 24, false, 'published'),
  ('WX1LWcPqF9Q', 'what-bgc-really-looks-like-philippines-bgc-shorts', 'What BGC really looks like #philippines #bgc #shorts', null, 'jooonbon', 'short', '{}'::text[], '2026-05-26T09:00:17-07:00'::timestamptz, 4, false, 'published'),
  ('gDD6xNGMwu8', 'my-first-time-trying-to-snowboard-didn-t-end-well', 'my first time trying to snowboard didn''t end well??', null, 'jooonbon', 'short', '{}'::text[], '2026-05-25T21:00:22-07:00'::timestamptz, 13, false, 'published'),
  ('0samf3pvMxY', 'watched-the-fireworks-in-whiterock-bc', 'watched the fireworks in Whiterock, BC', null, 'jooonbon', 'short', '{}'::text[], '2026-05-25T09:00:00-07:00'::timestamptz, 29, false, 'published'),
  ('d9nfFEgFCW0', 'this-felt-like-a-scene-from-blace-runner', 'this felt like a scene from Blace Runner', null, 'jooonbon', 'short', '{}'::text[], '2026-05-24T21:00:22-07:00'::timestamptz, 34, false, 'published'),
  ('yyO4NiUJ64k', 'this-streetfood-in-china-is-so-good', 'This streetfood in CHINA is so good!', null, 'jooonbon', 'short', '{}'::text[], '2026-05-24T09:01:06-07:00'::timestamptz, 61, false, 'published'),
  ('WfYCGgRWUYs', 'these-dancers-aren-t-real-ai-generated-sora-aigenerated-mindblown', 'These Dancers Aren''t Real (AI Generated) 🤖✨ #sora #aigenerated #mindblown', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-23T21:00:29-07:00'::timestamptz, 14, false, 'published'),
  ('NfJLAxujyuk', 'life-has-a-funny-way-of-teaching-us-lessons', 'life has a funny way of teaching us lessons', null, 'jooonbon', 'short', '{}'::text[], '2026-05-23T12:48:57-07:00'::timestamptz, 11, false, 'published'),
  ('S2Gc5Kd77JI', 'this-frozen-lake-is-unreal-frozenlake-winter-shorts', 'This Frozen Lake is Unreal #frozenlake #winter #shorts', 'Scenes from when me and my friends hiked the Joffre Lake last winter. #vancouver #pemberton', 'jooonbon', 'short', '{}'::text[], '2026-05-23T09:00:26-07:00'::timestamptz, 9, false, 'published'),
  ('zDPpc398ekM', 'who-knows-what-i-m-doing', 'Who knows what I’m doing?', null, 'jooonbon', 'short', '{}'::text[], '2026-05-22T22:38:19-07:00'::timestamptz, 13, false, 'published'),
  ('C9KvHMQwKbg', 'seeing-statue-of-liberty-for-the-first-time', 'Seeing Statue of Liberty for the first time', null, 'jooonbon', 'short', '{}'::text[], '2026-05-22T21:00:07-07:00'::timestamptz, 14, false, 'published'),
  ('eRfH_VdyTNc', 'caught-on-camera-at-shipyards-during-golden-hour-wildlife-vancouver-shorts', 'Caught on camera at Shipyards during golden hour #wildlife #vancouver #shorts', null, 'jooonbon', 'short', '{}'::text[], '2026-05-22T09:00:55-07:00'::timestamptz, 14, false, 'published'),
  ('lexMLlVqS0Y', 'when-life-gives-you-tangerines', 'When life gives you tangerines', 'When life gives you tangerines... you make a Reel out of it. 😆
____
📍Lakeland Flowers, Abbotsford Tulip Festival
.
.
.
.
.
.
Follow @jooonbon for more travel content. 
_______
#TangerineDream #travel #WhenLifeGivesYouTangerines #explorepage #reels', 'jooonbon', 'short', '{}'::text[], '2026-05-21T11:58:22-07:00'::timestamptz, 13, false, 'published'),
  ('GiAwKhPyHNw', 'choose-to-be-kind-travel-traveljournal', 'Choose to be kind #travel #traveljournal', null, 'jooonbon', 'short', '{}'::text[], '2026-05-21T00:00:13-07:00'::timestamptz, 10, false, 'published'),
  ('uCO1wYGpH9M', 'the-designated-single-sibling', 'The Designated Single Sibling 😂', 'and he''s already planning the next trip on the current trip 😆
_____
Follow @jooonbon for more travel content. 
_____
#explorepage #reels #travel', 'jooonbon', 'short', '{}'::text[], '2026-05-20T23:50:42-07:00'::timestamptz, 13, false, 'published'),
  ('anKe39-dXHU', 'solo-at-a-bangkok-bar-and-i-m-never-leaving-thailand-bangkok-nightlife', 'Solo at a Bangkok bar and I''m never leaving #thailand #bangkok #nightlife', 'It was my last night in Bangkok and I decided to go to a bar alone. Made a lot of new friends and I badly wanna go back!  #bangkok #travel #travel', 'jooonbon', 'short', '{}'::text[], '2026-05-20T22:00:01-07:00'::timestamptz, 113, false, 'published'),
  ('iQzE52v6SmI', 'vancouver-s-playland-is-finally-open', 'Vancouver’s Playland is Finally Open!!', 'Playland is Officially UNLOCKED 🔓
_
The park is officially open for the 2026 season! If you’re planning a trip down to the PNE grounds, hit the SAVE button on this post so you have all the updated details handy before you head out.
📍 Where: Playland at the PNE (Vancouver, BC)
📅 When: Open weekends now (May/June), shifting to Wednesday–Sunday starting July 1st!
⏰ Hours: 11am–5pm (May) | 11am–6pm (June–August) | Extended to 9pm on select mid-summer weekend nights.
⚡ Must-Ride: You have to hit…', 'jooonbon', 'short', '{}'::text[], '2026-05-20T14:42:04-07:00'::timestamptz, 38, false, 'published'),
  ('EYw14CXdXzc', 'when-the-client-asked-for-a-lana-del-rey-vibe', 'When the client asked for a Lana Del Rey vibe', null, 'jooonbon', 'short', '{}'::text[], '2026-05-20T10:38:58-07:00'::timestamptz, 11, false, 'published'),
  ('K684WnAJ2Lo', 'i-thuyen-rung-dua-kham-pha-hoi-an-theo-cach-khac-adventure-vietnam', 'Đi thuyền rừng dừa, khám phá Hội An theo cách khác #adventure #vietnam', 'I recently visited the Bay Mau Coconut Forest in Hoi An, Vietnam, and it was quite an experience. The locals navigate these incredible basket boats through the coconut groves, making it a unique travel adventure. This 4k video captures the vibrant energy and beauty of the area.', 'jooonbon', 'short', '{}'::text[], '2026-05-20T10:00:21-07:00'::timestamptz, 47, false, 'published'),
  ('XLx7IP5WdjY', 'how-it-feels-when-you-re-clueless-at-a-random-country', 'How it feels when you''re clueless at a random country', null, 'jooonbon', 'short', '{}'::text[], '2026-05-19T22:00:20-07:00'::timestamptz, 12, false, 'published'),
  ('4NhIDW36L_U', 'trying-out-the-stinky-tofu-in-china-chengdu-stinkytofu', 'Trying out the stinky tofu in China #chengdu #stinkytofu', 'Didn''t expect it to be this good!!', 'jooonbon', 'short', '{}'::text[], '2026-05-19T10:00:04-07:00'::timestamptz, 11, false, 'published'),
  ('2ewi8-MalLE', 'this-tofino-beach-moment-is-unmatched-coastal-peaceful-shorts', 'This Tofino beach moment is unmatched 🌅✨ #coastal #peaceful #shorts', 'Really grateful to have an opportunity to travel with my parents. I''ll forever chersih this trip! #tofino #vancouverisland #traveljournal #canada', 'jooonbon', 'short', '{}'::text[], '2026-05-18T22:00:01-07:00'::timestamptz, 30, false, 'published'),
  ('B1_w3dUOFq0', 'vietnam-in-20seconds-traveljournal-vietnam-danang', 'Vietnam in 20seconds!  #traveljournal #vietnam #danang', 'Some of the scenes from Da Nang vietnam! Really miss this place alot.', 'jooonbon', 'short', '{}'::text[], '2026-05-18T10:00:12-07:00'::timestamptz, 21, false, 'published'),
  ('aNNLqCBVp0w', 'alex-calleja-in-vancouver', 'Alex Calleja in Vancouver!', null, 'jooonbon', 'short', '{}'::text[], '2026-05-17T22:00:02-07:00'::timestamptz, 127, false, 'published'),
  ('B0BLuLfJpMo', 'aquarium-cafe-in-cavite', 'Aquarium Cafe in Cavite?!', null, 'jooonbon', 'short', '{}'::text[], '2026-05-17T10:00:11-07:00'::timestamptz, 31, false, 'published'),
  ('JWBmL9g6JR4', 'coffee-shops-in-hanoi-are-a-vibe-hanoi-vietnam', 'Coffee Shops in Hanoi are a Vibe #hanoi #vietnam', null, 'jooonbon', 'short', '{}'::text[], '2026-05-16T22:00:15-07:00'::timestamptz, 17, false, 'published'),
  ('AKdjmJ52m_w', 'first-time-celebrating-the-new-year-s-eve-in-a-different-country-hanoi-vietnam-t', 'First Time Celebrating the New Year''s Eve in a Different Country #hanoi #vietnam #traveljournal', null, 'jooonbon', 'short', '{}'::text[], '2026-05-16T10:00:10-07:00'::timestamptz, 17, false, 'published'),
  ('IpabgD_yFNg', 'got-photobombed-in-chongqing', 'Got photobombed in Chongqing', null, 'jooonbon', 'short', '{}'::text[], '2026-05-15T22:00:16-07:00'::timestamptz, 23, false, 'published'),
  ('h5LH-HQ44sA', 'i-just-turned-29-heheh', 'I just turned 29 heheh', 'Just turned 29. 
-
Incredibly grateful for the people, the places I get to go, and the lessons along the way. 
_
Appreciate u all! 🫡', 'jooonbon', 'short', '{}'::text[], '2026-05-15T13:52:54-07:00'::timestamptz, 11, false, 'published'),
  ('9uO9jZa383U', 'last-fireworks-in-vancouver', 'Last fireworks in Vancouver', 'Last scenes from the winner of Honda''s Celebration of Lights 2026 in Vancouver #vancouver #canada', 'jooonbon', 'short', '{}'::text[], '2026-05-15T10:00:12-07:00'::timestamptz, 53, false, 'published'),
  ('WQf5i_fMsb8', 'compiling-the-best-sunsets-in-vancouver', 'Compiling the best sunsets in Vancouver', null, 'jooonbon', 'short', '{}'::text[], '2026-05-14T22:00:24-07:00'::timestamptz, 27, false, 'published'),
  ('zDFHJkP832g', 'canada-day-fireworks-light-up-vancouver-canadaday-vancouver-fireworks', 'Canada Day fireworks light up Vancouver 🇨🇦 #canadaday #vancouver #fireworks', null, 'jooonbon', 'short', '{}'::text[], '2026-05-14T10:01:14-07:00'::timestamptz, 14, false, 'published'),
  ('BDRRBSD1CjA', 'china-s-most-stunning-twin-towers-discoverchina-travel', 'China''s Most Stunning Twin Towers #discoverchina #travel', null, 'jooonbon', 'short', '{}'::text[], '2026-05-13T22:00:19-07:00'::timestamptz, 15, false, 'published'),
  ('-GDHSiD4JlU', 'something-to-think-about-travel-traveljournal', 'Something to think about  #travel #traveljournal', null, 'jooonbon', 'short', '{}'::text[], '2026-05-13T18:44:36-07:00'::timestamptz, 10, false, 'published'),
  ('JGWhifgGCDg', 'is-this-wong-kar-wai', 'Is this Wong Kar Wai', null, 'jooonbon', 'short', '{}'::text[], '2026-05-13T10:00:20-07:00'::timestamptz, 38, false, 'published'),
  ('GeQUj3ZC2wI', 'this-corgi-s-reaction-to-the-tulip-field-dog-nature-travel', 'This corgi''s reaction to the tulip field 😍 #dog #nature #travel', 'Moments from Lakeland Flowers in Abbotsford, British Columbia 

Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-12T18:24:22-07:00'::timestamptz, 9, false, 'published'),
  ('tsotLUFQzGk', 'this-chinese-city-looks-fake-chongqing-cyberpunk-travel', 'This Chinese City Looks Fake #chongqing #cyberpunk #travel', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 
_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-12T10:49:07-07:00'::timestamptz, 9, false, 'published'),
  ('z712VQXeXR8', 'this-cafe-in-hanoi-is-a-vibeeee', 'This cafe in Hanoi is a vibeeee', 'Welcome to My Travel Journal. This is part of my 365-day filmmaking challenge where I try to capture the world through my lens.

Connect with me: instagram.com/jonbontabas 


_________
#traveljournal #filmmaker #cinematic #reelsvideo #sonyalpha #vancouver #travelgram #creativestorytelling', 'jooonbon', 'short', '{}'::text[], '2026-05-12T10:42:40-07:00'::timestamptz, 19, false, 'published'),
  ('DaciO9XrpsI', 'camping-at-harrison-lake-canada', 'Camping at Harrison Lake, Canada', null, 'jooonbon', 'short', '{}'::text[], '2026-05-12T10:00:22-07:00'::timestamptz, 11, false, 'published'),
  ('JCJCKViZe6A', 'the-secret-pros-don-t-tell-you-about-lighting-filmmaking-tips-funny', 'The Secret Pros Don''t Tell You About Lighting #filmmaking #tips #funny', null, 'jooonbon', 'short', '{}'::text[], '2026-05-12T09:44:02-07:00'::timestamptz, 9, false, 'published'),
  ('LD7APFc0Cvo', 'that-baguio-drive-hit-different-travel-philippines-roadtrip', 'That Baguio drive hit different #travel #philippines #roadtrip', 'Late night drives hit different', 'jooonbon', 'short', '{}'::text[], '2026-05-12T09:37:10-07:00'::timestamptz, 24, false, 'published'),
  ('9AaB40Y4Ac0', 'didn-t-expect-this-my-second-day-in-new-york-newyork-snow-travel-whitechristmas', 'Didn''t expect this my second day in New York #newyork #snow #travel #whitechristmas', null, 'jooonbon', 'short', '{}'::text[], '2026-05-12T09:35:29-07:00'::timestamptz, 43, false, 'published'),
  ('tmZegMne1Sg', 'inside-the-tallest-skyscraper-in-manhattan', 'Inside the tallest skyscraper in Manhattan', null, 'jooonbon', 'short', '{}'::text[], '2026-05-11T22:00:48-07:00'::timestamptz, 31, false, 'published'),
  ('LE7Z6bDUQ5g', 'kodak-s-first-time-to-see-the-tulips-dogs-tulips-vancouver', 'Kodak’s first time to see the tulips!! #dogs #tulips #vancouver', null, 'jooonbon', 'short', '{}'::text[], '2026-05-11T21:25:42-07:00'::timestamptz, 16, false, 'published'),
  ('-RGOnfFgCZU', 'i-wanna-go-back-to-uni-life', 'I wanna go back to uni life', null, 'jooonbon', 'short', '{}'::text[], '2026-05-11T10:00:00-07:00'::timestamptz, 20, false, 'published'),
  ('7kojMn9Dui8', 'didn-t-expect-my-iphone-footage-to-be-like-this-cinematic-iphone-mobilevideograp', 'Didn''t expect my iphone footage to be like this #cinematic #iphone #mobilevideography', 'I was recently experimenting with the Apple Log. Turns out, it''s almost the same footage as my sony cameras. I just added some vintage filters in post to make it more dreamy. 

Shot on an iphone + blackmagic camera application.', 'jooonbon', 'short', '{}'::text[], '2026-05-11T09:41:02-07:00'::timestamptz, 11, false, 'published'),
  ('6T10TL3_E8k', 'scenes-from-baofeng-lake-zhangjiajie-china-traveljournal', 'Scenes from BaoFeng Lake #zhangjiajie #china #traveljournal', null, 'jooonbon', 'short', '{}'::text[], '2026-05-11T08:58:41-07:00'::timestamptz, 15, false, 'published'),
  ('RGUZ4_TFwYE', 'coming-back-to-your-hometown', 'Coming back to your hometown', null, 'jooonbon', 'short', '{}'::text[], '2026-05-10T21:00:34-07:00'::timestamptz, 19, false, 'published'),
  ('eFGDPeXEf6k', 'a-memorable-trip-to-hulugan-falls', 'A Memorable Trip to Hulugan Falls', null, 'jooonbon', 'short', '{}'::text[], '2026-05-10T10:00:56-07:00'::timestamptz, 17, false, 'published'),
  ('B6s5qwtbU7A', '1-michelin-breakfast-in-hanoi', '$1 Michelin Breakfast in Hanoi 🇻🇳', 'Banh Cuon Ba Xuan | Hanoi 🥢', 'jooonbon', 'short', '{}'::text[], '2026-05-09T21:16:44-07:00'::timestamptz, 44, false, 'published'),
  ('8K3KuH6aBdE', 'the-goal-is-to-experience', '..the goal is to experience', null, 'jooonbon', 'short', '{}'::text[], '2026-05-09T21:02:07-07:00'::timestamptz, 7, false, 'published'),
  ('j-uP1InGrZI', 'test-footage-anamorphic-lens-on-an-iphone', 'Test Footage: Anamorphic lens on an iPhone', null, 'jooonbon', 'short', '{}'::text[], '2026-05-09T20:55:33-07:00'::timestamptz, 19, false, 'published'),
  ('0F3r4TNFfr0', 'friendship-like-this-doesn-t-come-around-often-shorts-vancouver', 'friendship like this doesn''t come around often #shorts #vancouver', null, 'jooonbon', 'short', '{}'::text[], '2026-05-09T20:30:01-07:00'::timestamptz, 9, false, 'published'),
  ('u77rtnOYbPM', 'didn-t-expect-this-from-a-cheap-lens', 'Didn''t expect this from a cheap lens', 'Minimalist: $50 lens, million dollar views. 🎆', 'jooonbon', 'short', '{}'::text[], '2026-05-09T20:26:58-07:00'::timestamptz, 21, false, 'published'),
  ('xJsc81-zmB8', 'dragon-treasure-castle-in-baguio', 'Dragon Treasure Castle in Baguio', null, 'jooonbon', 'short', '{}'::text[], '2026-05-09T20:01:08-07:00'::timestamptz, 8, false, 'published'),
  ('YShuZI6Fajo', 'he-didn-t-just-say-that', 'He didn''t just say that 😆', 'Day 01 of posting until my storage can breathe again.

I spent the day at Italian Day on the Drive. It is a big festival in Vancouver. The sun was hot. The street was full of people and good food. I saw a man juggling a stroller. It looked very heavy. He was very fast. He told the crowd he wants to try it with a baby next time. Everyone laughed at his joke. I am glad I caught this moment on film.

#vancouver #italianday #streetperformer #traveljournal #shorts #commercialdrive', 'jooonbon', 'short', '{}'::text[], '2026-05-09T18:30:32-07:00'::timestamptz, 12, false, 'published'),
  ('rnhBnrfAo_0', 'christmas-market-at-the-shipyards', 'Christmas Market at the Shipyards', null, 'jooonbon', 'long', array['client-work']::text[], '2026-05-08T14:43:32-07:00'::timestamptz, 90, false, 'published'),
  ('yBjIZIR-PdE', 'lights-at-lafarge-lake', 'Lights at Lafarge Lake', 'Lights at Lafarge Lake is the largest free outdoor light display in the Lower Mainland. This video documents the opening of the annual event at Town Centre Park in Coquitlam', 'jooonbon', 'long', array['client-work']::text[], '2026-05-08T14:43:20-07:00'::timestamptz, 82, false, 'published'),
  ('MyHJ-mTycfQ', 'monster-jam-in-vancouver', 'Monster Jam in Vancouver', 'Exclusive sneak peek on Monster Jam show that happened in Vancouver''s Pacific Coliseum.', 'jooonbon', 'long', array['client-work']::text[], '2026-05-08T14:42:25-07:00'::timestamptz, 92, false, 'published'),
  ('ibEM4kbjwp0', 'chinatown-parade-in-vancouver', 'Chinatown Parade in Vancouver', null, 'jooonbon', 'long', array['client-work']::text[], '2026-04-01T20:53:19-07:00'::timestamptz, 85, false, 'published'),
  ('TOwYbB3JOBM', 'new-york-city-a-visual-diary', 'New York City | a visual diary 🗽', 'new york city through my lens 🗽


---

#NYC #NewYork #TravelMontage #NewYorkCity #CinematicTravel #SilentVlog #TravelDiary #Manhattan #NYCVibes #TravelVideo #VisualDiary #Aesthetic #CityLife #UrbanExploration

---


📍 New York City
📅 January 2025
📷 Shot on Sony FX3 | Sony 24-105mm F/4.0

---

thanks for watching 🤍

---

🔔 subscribe for more travel diaries
📱 instagram: @jooonbon', 'jooonbon', 'long', '{}'::text[], '2025-11-08T23:48:23-08:00'::timestamptz, 84, false, 'published'),
  ('aZIGOaQo6w0', 'what-really-happens-at-canada-day-in-vancouver-2025', 'What Really Happens at Canada Day in Vancouver? (2025)', 'Hey everyone! 👋

I just had the BEST Canada Day exploring Vancouver! Started my morning at Burrard Station, made my way through some incredible spots, and ended with an unforgettable night. Let me take you through my day!

🇨🇦 My Canada Day Journey:

📍 **Canada Place** (Downtown)
Kicked things off at Canada Place where they had the whole setup - concerts, food booths, and so many people celebrating! The energy was incredible and you could feel the Canada Day spirit everywhere.

🍺 **Granvill…', 'jooonbon', 'long', '{}'::text[], '2025-11-08T19:19:43-08:00'::timestamptz, 102, false, 'published'),
  ('zmtcBjIQPqw', 'telesin-fun-shot-magnetic-grip-iphone-camera-grip', 'Telesin Fun Shot Magnetic Grip - iPhone Camera Grip!', 'Make your phone feel like a real camera.
.
With the Telesin MagSafe Grip + Selfie Light, filming goes from basic to pro in seconds. Snap it on, switch from vertical to horizontal, and hit record with the remote button. No more shaky footages.
Perfect for reels, vlogs, or quick shoots on the go.
.
.
.
#telesin #telesinmagneticgrip #iphonecameragrip @telesin_official @telesin.global', 'jooonbon', 'short', '{}'::text[], '2025-09-26T16:17:26-07:00'::timestamptz, 32, false, 'published'),
  ('hd9vQ8uR034', 'how-to-make-millions-before-grandma-dies-2024-film', 'How to Make Millions Before Grandma Dies (2024) #film', null, 'jooonbon', 'short', '{}'::text[], '2025-09-02T17:14:10-07:00'::timestamptz, 58, false, 'published'),
  ('qraJ4a6Jghs', 'recreating-past-lives-2023', 'Recreating Past Lives (2023)', null, 'jooonbon', 'short', '{}'::text[], '2025-09-02T17:12:55-07:00'::timestamptz, 42, false, 'published'),
  ('PVlnaF_i06c', 'filed-under-someday-plans', 'Filed under: someday plans :)', null, 'jooonbon', 'short', '{}'::text[], '2025-06-17T19:50:57-07:00'::timestamptz, 44, false, 'published'),
  ('Y_mRW8w4_5E', 'vancouver-s-best-italian-celebration', 'Vancouver''s Best Italian Celebration', 'Some scenes from ''Italian Day on the Drive''

____________
Edited and graded in @davinciresolvestudio 
Music from @epidemicsound 


📲 Follow me for more content:  
📸 Instagram: @jooonbon  
🎭 TikTok: @jonbontabas  
📌 Threads: @jooonbon', 'jooonbon', 'long', '{}'::text[], '2025-06-10T18:22:03-07:00'::timestamptz, 98, false, 'published'),
  ('3fzJA_1YhqE', 'the-sound-of-new-york', 'the sound of New York', null, 'jooonbon', 'short', '{}'::text[], '2025-06-06T19:47:47-07:00'::timestamptz, 33, false, 'published'),
  ('KUNCcv0-uQU', 'we-dont-realize-it-often-but-we-re-in-the-most-able-most-alive-version-of-oursel', 'We dont realize it often, but we’re in the most able, most alive version of ourselves right now', null, 'jooonbon', 'short', '{}'::text[], '2025-06-05T15:03:40-07:00'::timestamptz, 15, false, 'published'),
  ('5B1UeS0LqxY', 'pov-you-re-inside-an-a24-film-cinematic-travel-colorgrading-davinciresolve-a24-f', 'POV: You''re inside an A24 film #cinematic #travel #colorgrading #davinciresolve #a24 #filmmaking', 'That time when I visited some of the filming locations from the movie Past Lives. Most of these clips were shot in Brooklyn. #travel #cinematic #film #davinciresolve', 'jooonbon', 'short', '{}'::text[], '2025-05-31T10:00:07-07:00'::timestamptz, 40, false, 'published'),
  ('NsgfW89exQc', 'the-sounds-of-new-york-travel-travel-newyorkcity-nyc-davinciresolve-colorgrading', 'The Sounds of New York #travel #travel #newyorkcity #nyc #davinciresolve #colorgrading #dehancer', null, 'jooonbon', 'short', '{}'::text[], '2025-05-31T01:26:03-07:00'::timestamptz, 33, false, 'published'),
  ('z8s2zcBFOiQ', 'bro-thinks-he-s-a-filmmaker-nyc-newyork-travelvlog-sonyfx3', 'Bro thinks he''s a filmmaker #nyc #newyork #travelvlog #sonyfx3', null, 'jooonbon', 'short', '{}'::text[], '2025-05-30T10:01:30-07:00'::timestamptz, 17, false, 'published'),
  ('APuIHKJHoKw', 'the-world-s-tallest-outdoor-elevator-bailonglift-travel-cinematicvlog-china-solo', 'The World’s Tallest Outdoor Elevator #BailongLift #travel #cinematicvlog #china #solotravel', 'Riding the Bailong Elevator in China - a glass lift built into a cliff face over 300 meters high. You won’t believe the view.#cinematic #filmmaking #travel', 'jooonbon', 'short', '{}'::text[], '2025-05-29T17:00:11-07:00'::timestamptz, 23, false, 'published'),
  ('EQ2wg3k2KSA', 'why-is-no-one-talking-about-da-nang-travel-lifeisbutadream-vietnam-solotravel-ci', 'Why is No One Talking About Da Nang? #travel #lifeisbutadream #vietnam #solotravel #cinematicvlog', null, 'jooonbon', 'short', '{}'::text[], '2025-05-29T13:23:56-07:00'::timestamptz, 22, false, 'published'),
  ('VeI-us3tXjk', 'take-me-back-to-the-night-we-met-travel-nyc-cinematic-colorgrading', 'Take me back to the night we met #travel #nyc #cinematic #colorgrading', null, 'jooonbon', 'short', '{}'::text[], '2025-05-16T10:00:40-07:00'::timestamptz, 22, false, 'published'),
  ('v22COasTYIg', 'this-is-your-sign-to-travel-travel-sony-cinematic-colorgrading', 'This is your sign to travel #travel #sony #cinematic #colorgrading', 'I’ve been traveling for a while now and I realized it’s not just about seeing new places. It’s more about what I learn along the way. Every time I go somewhere, I see how different life is outside my usual routine. Sometimes it’s fun, sometimes it’s tiring, but I always take something with me after each trip. Traveling helps me understand myself better and reminds me how big the world really is.', 'jooonbon', 'short', '{}'::text[], '2025-05-15T11:46:46-07:00'::timestamptz, 52, false, 'published'),
  ('d-uG2So7MFs', 'may-15-2025', 'May 15, 2025', null, 'jooonbon', 'short', '{}'::text[], '2025-05-15T07:02:07-07:00'::timestamptz, 24, false, 'published'),
  ('IVHawg4Pq8s', 'local-coffee-shop-in-vietnam-cietnam-travel-coffee', 'Local Coffee Shop in Vietnam #cietnam #travel #coffee', null, 'jooonbon', 'short', '{}'::text[], '2025-05-14T17:19:17-07:00'::timestamptz, 15, false, 'published'),
  ('DMSZosAXu4U', 'this-is-bowen-island-travel-explorebc-bowenisland-travel-vancouver', 'This is Bowen Island #travel  #explorebc #bowenisland #travel #vancouver', null, 'jooonbon', 'short', '{}'::text[], '2025-05-14T06:16:47-07:00'::timestamptz, 28, false, 'published'),
  ('i9ch23aR7KE', 'spring-archives-sony-fx3-cineprint', 'Spring Archives | Sony FX3 | Cineprint', 'Clips from spring 

Gear used: Sony A7C, Tamron 28-75mm
Color Graded with DaVinci Resolve', 'jooonbon', 'long', '{}'::text[], '2025-05-09T17:55:32-07:00'::timestamptz, 84, false, 'published'),
  ('xzi7tFeGVWw', 'a-day-in-manila-manila-travel-travelvlog-philippines', 'A Day in Manila #manila #travel #travelvlog #philippines', null, 'jooonbon', 'short', '{}'::text[], '2025-05-08T12:32:30-07:00'::timestamptz, 24, false, 'published'),
  ('4iac9lpMuQQ', 'dragon-bridge', 'Dragon Bridge', null, 'jooonbon', 'short', '{}'::text[], '2025-05-05T01:38:22-07:00'::timestamptz, 26, false, 'published'),
  ('7MOovhAPw50', 'this-is-da-nang', 'This is Da Nang', null, 'jooonbon', 'short', '{}'::text[], '2025-05-02T19:57:34-07:00'::timestamptz, 29, false, 'published'),
  ('AwmKSTVQF8k', 'most-beautiful-garden-in-the-world-victoria-bc-cinematic-vlog', 'MOST beautiful garden in the WORLD (Victoria BC) | Cinematic Vlog', 'We visited Butchart Gardens in Victoria, Canada — often called the world’s most beautiful garden! 


📲 Follow me for more content:  
📸 Instagram: @jooonbon  
🎭 TikTok: @jonbontabas  
📌 Threads: @jooonbon  

#ButchartGardens #VictoriaBC #WorldsMostBeautifulGarden #GardenTravel #CanadaTravel #TravelVlog #NatureLovers #FloralParadise #SunkenGarden #ExploreCanada #CinematicVlogs #SonyAlpha #SonyFX3 #exploreBC #britishcolumbia #cinematic #cine #cinematicvlog #colorgrading #davinciresolve #tamron…', 'jooonbon', 'long', '{}'::text[], '2025-03-15T21:35:48-07:00'::timestamptz, 1023, false, 'published'),
  ('8hPUil_LQVw', 'we-went-to-victoria-bc-cinematic-vlog', 'We went to Victoria BC | Cinematic Vlog', null, 'jooonbon', 'long', '{}'::text[], '2025-03-13T18:10:37-07:00'::timestamptz, 747, false, 'published'),
  ('cB6dvHjjV-0', 'this-is-what-a-real-day-in-vancouver-looks-like', 'This is what a real day in Vancouver looks like', 'My family finally visited me in Vancouver! We tried to fit as much as possible into one day—riding the SkyTrain, taking the Seabus to North Vancouver, grabbing food at an Asian store, and attempting a hike to Deep Cove (spoiler: we didn’t finish 😅). It was a day full of mundane moments, but I honestly think that these are the ones that matter the most.

If you’re planning a one-day trip in Vancouver, this video will give you an idea of what you can realistically do! Whether you''re a tourist or…', 'jooonbon', 'long', '{}'::text[], '2025-03-11T22:27:01-07:00'::timestamptz, 589, false, 'published'),
  ('hUisANYUUA8', 'that-one-sunny-morning-in-new-york', 'That one sunny morning in New York', null, 'jooonbon', 'long', '{}'::text[], '2025-03-10T18:07:30-07:00'::timestamptz, 36, false, 'published'),
  ('KjOAC5guJks', 'past-lives-recreated-sony-fx3', 'Past Lives (Recreated) | Sony FX3', 'I recently went to New York to recreate some scenes from the movie Past Lives. This fun project was a chance to pay tribute to one of the most heartfelt films I’ve ever watched.

Shot using the Sony FX3, I focused on the cinematic elements—from the framing to the color grading—to make it feel as authentic as possible.

I hope you enjoy watching this and seeing how I brought the essence of Past Lives to life. Don’t forget to like, comment, and subscribe for more cinematic projects!


_______
Fol…', 'jooonbon', 'long', '{}'::text[], '2025-01-19T19:05:31-08:00'::timestamptz, 24, false, 'published'),
  ('Mt2HjcnZk6c', 'this-small-canadian-city-looks-stunning-on-camera', 'This Small Canadian City Looks Stunning on Camera', 'Recently spent a day capturing the beauty of Victoria, BC. The mix of peaceful views and historic spots made it feel like stepping into a different time. All clips were shot using my Sony camera—still learning, but I love how cinematic this turned out. 
 #VictoriaBC #Filmmaking #Cinematography #SonyAlpha #TravelCanada #NatureShots #Cityscape #Videography #DroneShots #SonyFX3 #VisualStorytelling #CanadaTravel #FilmMaker #CinematicTravel #VlogLife #SonyShooter #ExploreCanada #BeautifulDestination…', 'jooonbon', 'long', '{}'::text[], '2025-01-04T02:13:20-08:00'::timestamptz, 36, false, 'published'),
  ('XU6vgQv6OIA', 'realizin-that-today-is-the-youngest-we-ll-ever-be-first-peak-at-stawamus-chief-t', 'Realizin that today is the youngest we’ll ever be.📍First peak at Stawamus Chief #travel #squamish', null, 'jooonbon', 'short', '{}'::text[], '2024-08-27T15:43:59-07:00'::timestamptz, 21, false, 'published'),
  ('JEC98VYkkdI', 'why-you-should-try-new-things-alone-sony-fx3', 'Why You Should Try New Things Alone | Sony FX3', '📷Sony FX3 with Tamron 28-75 2.8
Edited and Graded in DaVinci Resolve 
Music: Crazy Good by Jesse Lawrence (Epidemic Sound)
______________________________________
Instagram: @jooonbon 
Finance Channel: ‪@BonFinance‬ 
______________________________________

#sonyfx3 #sony #vancouver #vancouverbc #vancouver #burnaby #bbc #canada #canadalife #canadavlogs #filmmakng #colorgrading #davinciresolve #cinematic #cine #cinematography #pho', 'jooonbon', 'long', '{}'::text[], '2024-08-13T15:17:36-07:00'::timestamptz, 206, false, 'published'),
  ('8q9tjaV6HyM', 'for-those-feeling-lonely-sony-fx3', 'For those feeling lonely... | Sony FX3', '📷Sony FX3 with Tamron 28-75 2.8
Edited and Graded in DaVinci Resolve 
Music: A Gentle Invitation by Dawn Dawn Dawn (Epidemic Sound)
______________________________________
Instagram: @jooonbon 
Finance Channel: ‪@BonFinance‬ 
______________________________________

#sonyfx3 #sony #vancouver #vancouverbc #vancouver #burnaby #stanleypark #bbc #canada #canadalife #canadavlogs #filmmakng #colorgrading #davinciresolve #cinematic #cine #cinematography', 'jooonbon', 'long', '{}'::text[], '2024-08-12T13:29:17-07:00'::timestamptz, 183, false, 'published'),
  ('VwfO_hZlW5w', 'solo-hike-cinematic-film-lighthouse-park', 'Solo Hike Cinematic Film | Lighthouse Park', 'Had a chance to go on a solo trail at Lighthouse Park in West Vancouver
_______________________________________


Edited and Graded in DaVinci Resolve with Cineprint 16 by Tom Bolles

______________________________________
Instagram: @jooonbon 
Finance Channel: ‪@BonFinance‬ 
______________________________________

#sonyalpha #sonyfx3 #britishcolumbia #canada #vancouverbc #vancouver #filmemulation #film #cineprint16  #vancouverspots', 'jooonbon', 'long', '{}'::text[], '2024-07-27T19:51:23-07:00'::timestamptz, 62, false, 'published'),
  ('ifXUnlnV9eI', 'walking-at-burnaby-mountain-park-film-emulation-sony-a7c', 'Walking at Burnaby Mountain Park | Film emulation | Sony A7C', 'Some scenes from our recent walk through Burnaby Mountain Park. This place holds some of the most peaceful and beautiful spots I''ve ever seen. You get a good vantage point of the city. The trail was fairly easy except for the Cardiac Hill section where it gets really steep going uphill. Enjoy the video 😊
________________________
📷Sony A7C with Tamron 28-75 2.8
Edited and Graded in DaVinci Resolve with Cineprint 16 by Tom Bolles
Music: The Simplest Things by Gavin Luke (Epidemic Sound)
_______…', 'jooonbon', 'long', '{}'::text[], '2024-07-26T10:53:16-07:00'::timestamptz, 135, false, 'published'),
  ('jurqlL3YNt8', 'a-day-at-steveston-fisherman-s-wharf-film-emulation-sony-a7c', 'A Day at Steveston Fisherman''s Wharf | Film emulation | Sony A7C', 'Had a chance to unwind at Steveston Fisherman''s Wharf right after my last day of exams. It was a regular hot day during the Spring season so the first thing I did was grab an ice cream to cool down. The place was nice, the structures give a vibrant retro vibe of Steveston. There were not too many people around, it was the perfect time to explore and walk around. Indeed, the salmon burger was a must-try.  

________________________
Instagram: @jooonbon



#sonya7c #sony #richmond #vancouverbc #v…', 'jooonbon', 'long', '{}'::text[], '2024-07-25T13:48:54-07:00'::timestamptz, 213, false, 'published'),
  ('Ropc1kxGGbI', 'accountant-explains-how-to-track-your-finances', 'ACCOUNTANT EXPLAINS: How to track your Finances', 'n this video, I will explain how to use Bkper to track your finances and net worth effectively. Whether you''re new to personal finance or looking to refine your financial tracking system, this tutorial will guide you through the essential steps to get started. Learn how to set up your Bkper account, categorize your transactions, and generate insightful reports to gain a clearer picture of your financial health. Join me as we explore the features of Bkper and make personal finance management sim…', 'bonpoints', 'long', '{}'::text[], '2024-07-18T10:27:19-07:00'::timestamptz, 590, false, 'published'),
  ('vPX51T96uIg', 'my-first-thanksgiving-day-in-canada-sony-a7c', 'My First Thanksgiving Day in Canada | Sony A7C', 'Video Journal: "Thanksgiving"
October 9, 2023 
This was the day that I celebrated my first Thanksgiving Day in Canada. I am grateful to share this day with my close relatives. It was also my first time to eat a stuffed turkey. Core memory indeed.', 'jooonbon', 'long', '{}'::text[], '2023-10-10T18:12:12-07:00'::timestamptz, 199, false, 'published'),
  ('JinM2CfFyXI', 'video-postcard-the-statue-of-liberty', 'Video Postcard: The Statue of Liberty', null, 'jooonbon', 'short', '{}'::text[], '2023-09-27T21:27:30-07:00'::timestamptz, 12, false, 'published'),
  ('lmpCUF8E2uA', 'the-lumberjack-show-at-grouse-mountain', 'The Lumberjack Show at Grouse Mountain', null, 'jooonbon', 'short', '{}'::text[], '2023-09-26T22:52:23-07:00'::timestamptz, 35, false, 'published'),
  ('FUWSPjQPUZI', 'the-white-house-washingtondc-thewhitehouse-videopostcard', 'The White House #washingtondc  #thewhitehouse #videopostcard', null, 'jooonbon', 'short', '{}'::text[], '2023-09-25T20:23:17-07:00'::timestamptz, 15, false, 'published'),
  ('v9kggw75oc4', 'a-day-in-vancouver', 'A Day in Vancouver', 'Exploring Vancouver''s Seawall: Enjoy a compilation of some clips capturing the beauty of Locarno Beach, the Kitsilano Beach, and the lively Granville Island. 

Let''s connect: 
Facebook - www.facebook.com/jooonbon
Instagram - www.instagram.com/jooonbon
Tiktok - @jonbontabas


#Vancouver #LocarnoBeach #Kitsilano #GranvilleIsland #StanleyPark #TravelMontage #ExploreVancouver #ExploreBC #VancouverSeawall', 'jooonbon', 'long', '{}'::text[], '2023-09-18T01:20:25-07:00'::timestamptz, 138, false, 'published'),
  ('LENGvoY_oms', 'why-caramoan-island-hopping-is-incredible-philippines', 'Why Caramoan Island Hopping is INCREDIBLE (Philippines)', '________________
Follow me:
Facebook - www.facebook.com/jooonbon
Instagram - www.instagram.com/jooonbon
Tiktok - @jonbontabas
_______________

#caramoan
#caramoanbeach
#caramoanislandhopping
#manlawisandbar
#camarinessur
#caramoantour
#caramoanvlog
#caramoantravelvlog', 'jooonbon', 'long', '{}'::text[], '2022-08-06T07:28:10-07:00'::timestamptz, 630, false, 'published'),
  ('KXVxXcJmISY', 'we-caught-50kgs-worth-of-ruby-snapper-in-batangas', 'We Caught 50kgs Worth of Ruby Snapper in Batangas!', 'How to Jig for a Snapper?
Here''s a video journal of our jigging trip in Nasugbu last September 2021

TIMESTAMPS
00:00 Introduction
00:20 Road to Nasugbu port
01:35 First Strike
03:00 Second Strike
03:20 Third Strike
03:30 Fourth Strike
05:00 Fifth and Sixth Strike
05:30 Seventh Strike
05:45 Lunch time
09:30 Outro

________________
Let''s connect!
Facebook - www.facebook.com/jooonbon
Instagram - www.instagram.com/jooonbon
Tiktok - @jonbontabas
_______________', 'jooonbon', 'long', '{}'::text[], '2022-06-05T02:36:32-07:00'::timestamptz, 768, false, 'published'),
  ('C36W1onI0T0', 'wakeboarding-at-the-camsur-watersports-complex', 'WAKEBOARDING AT THE CAMSUR WATERSPORTS COMPLEX!', 'Sharing our recent wakeboarding experience in Camsur Watersports Complex (CWC). 

TIMESTAMPS
00:00 Introduction
00:30 Road to CWC
01:00 Gear preparation
01:30 Orientation
01:45 Actual wakeboarding experience 
04:30 Outro

________________
Follow me:
Facebook - www.facebook.com/jooonbon
Instagram - www.instagram.com/jooonbon
Tiktok - @jonbontabas
_______________', 'jooonbon', 'long', '{}'::text[], '2022-05-19T03:51:07-07:00'::timestamptz, 287, false, 'published'),
  ('G312JACRg-U', 'i-swam-with-whale-sharks-in-donsol', 'I Swam With WHALE SHARKS In Donsol!', 'Sharing our recent trip in Donsol, Sorsogon where we got the chance to swim with the whale sharks. Definitely one of the coolest things we''ve ever done. 

TIMESTAMPS
00:00 Introduction
00:41 Dancalan Beach Resort arrival
02:15 Morning Stroll
03:17 Whale Shark Interaction Rules and Regulations
06:14 Orientation with the boat man
08:18 Boat Ride | Butanding Spotting
09:32 First Whale Shark Encounter
10:56 Second Whale Shark Encounter
12:00 Third Whale Shark Encounter
12:49 Fourth Whale Shark Enco…', 'jooonbon', 'long', '{}'::text[], '2022-05-11T08:06:33-07:00'::timestamptz, 1083, false, 'published'),
  ('PJ8JtUaTZJU', 'caramoan-island-hopping-experience-is-the-best-in-the-philippines', 'Caramoan Island Hopping Experience is the BEST in the Philippines!', 'Sharing our recent trip in Caramoan. 

Caramoan is a municipality located at the lower eastern part of Camarines Sur. There are two types of island hopping that you can experience in Caramoan: Short trip and Long trip. In this video we went for the Long Trip  where we explored the following places: 
    1. Guinahoan Lighthouse
    2. Manlawi Sandbar
    3. Cotivas Beach
    4. Sabitang Laya 

TIMESTAMPS
00:00 Introduction
00:30 Arrival at La Casa Roa Hostel
02:00 Morning Breakfast at La Casa Ro…', 'jooonbon', 'long', '{}'::text[], '2022-04-28T23:03:41-07:00'::timestamptz, 1058, false, 'published'),
  ('LOs7kOgZrkE', 'little-boracay-batangas-paradise-in-the-philippines', 'Little Boracay Batangas | Paradise in the Philippines', 'Sharing our recent trip in Calatagan, Batangas. 

TIMESTAMPS
00:00 Introduction
00:16 Cottage Dock Arrival
02:25 Sandbar & Little Boracay
03:07 Sandbar Aerial Broll
04:07 Lunch Time 
04:50 Snorkeling Spot 

________________
Follow me:
Facebook - www.facebook.com/jooonbon
Instagram - www.instagram.com/jooonbon
Tiktok - @jonbontabas
_______________
#Calatagan
#Littleboracay
#Littleboracaycottagerentals
#Littleboracaycalataganbatangas
#Littleboracaybatangas', 'jooonbon', 'long', '{}'::text[], '2022-04-12T06:49:04-07:00'::timestamptz, 430, false, 'published')
) as v (youtube_id, slug, title, description, brand, format, tags, published_at, duration_sec, featured, status)
where not exists (select 1 from videos x where x.slug = v.slug)
on conflict (youtube_id) do nothing;

commit;

-- ===== supabase/seed/products.sql =====
-- Two DRAFT products, one per brand, for trying the admin editor and the
-- product page. Drafts never show on /shop. Copy, prices and Stripe IDs are
-- placeholders: fill them in from /admin before publishing.
-- Idempotent: re-running leaves existing rows alone.

insert into shop_products
  (slug, title, subtitle, description, category, brand, price_formatted,
   features, faq, stripe_price_id, checkout_url, status, featured, "order")
values
  ('jooonbon-lut-pack-1',
   'LUT Pack 1',
   'Placeholder subtitle',
   'Placeholder description. Markdown works here: **bold**, lists and links.',
   'lut', 'jooonbon', null,
   array['Placeholder: what is included'],
   '[{"q": "Which editing apps does it work in?", "a": "Placeholder answer."}]'::jsonb,
   null, null, 'draft', false, 1),
  ('bonpoints-guide-1',
   'bon.points guide (placeholder)',
   'Placeholder subtitle',
   'Placeholder description.',
   'guide', 'bonpoints', null,
   array['Placeholder: what is included'],
   '[]'::jsonb,
   null, null, 'draft', false, 2)
on conflict (slug) do nothing;
