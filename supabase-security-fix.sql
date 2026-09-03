-- SECURITY FIX — run this in the Supabase SQL editor AFTER deploying the code
-- that moves admin writes to /api/admin. Running it first will break the admin
-- panel until that deploy lands.
--
-- What was wrong: the anon key ships in the browser bundle (by design — that is
-- what anon keys are for). It was paired with `for all using (true)` policies,
-- which meant anyone who opened DevTools could rewrite every blog post and
-- portfolio project, and read every contact inquiry. The admin password was
-- also inlined in the bundle, but that gate was cosmetic — the policies were
-- the actual hole.
--
-- After this file: the browser can read published content and submit the
-- contact form. Nothing else. All writes go through the serverless functions,
-- which hold the service_role key and bypass RLS.

-- 1. Remove the blanket anon write policies -------------------------------

drop policy if exists "Anon can manage blog posts"   on blog_posts;
drop policy if exists "Anon can manage portfolio"    on portfolio_projects;
drop policy if exists "Anon can manage destinations" on destinations;
drop policy if exists "Anon can read inquiries"      on contact_inquiries;

-- 2. Public read, scoped to published content only ------------------------

drop policy if exists "Public can read published posts" on blog_posts;
create policy "Public can read published posts"
  on blog_posts for select
  using (status = 'published');

-- Was `using (true)`, which leaked drafts to anyone who asked for them.
drop policy if exists "Public can read portfolio" on portfolio_projects;
create policy "Public can read portfolio"
  on portfolio_projects for select
  using (status = 'published' or status is null);

drop policy if exists "Public can read published destinations" on destinations;
create policy "Public can read published destinations"
  on destinations for select
  using (status = 'published');

-- The contact form still needs to accept submissions. Reading them is now
-- admin-only, through /api/admin.
drop policy if exists "Public can submit contact" on contact_inquiries;
create policy "Public can submit contact"
  on contact_inquiries for insert
  with check (true);

-- 3. Stop anonymous uploads into the media bucket -------------------------
-- Anyone with the anon key could write files into your storage. Reads stay
-- public (the bucket's public flag covers that, no policy needed); writes now
-- go through /api/admin with the service-role key.

do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (coalesce(qual, '') like '%media%' or coalesce(with_check, '') like '%media%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
    raise notice 'dropped storage policy: %', pol.policyname;
  end loop;
end $$;

-- 4. Brute-force protection for the new login endpoint --------------------
-- One password is the only gate now, so make guessing expensive.

create table if not exists admin_login_attempts (
  ip text primary key,
  fails integer default 0,
  window_start timestamptz default now()
);

alter table admin_login_attempts enable row level security;
-- No policies: service role only.

-- 5. Verify ---------------------------------------------------------------
-- Run this after and confirm nothing unexpected grants write access to anon:
--
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname in ('public', 'storage')
--   order by tablename, policyname;
--
-- Expected surviving policies:
--   blog_posts          SELECT  status = 'published'
--   portfolio_projects  SELECT  status = 'published' or status is null
--   destinations        SELECT  status = 'published'
--   contact_inquiries   INSERT  true
--   shop_products       SELECT  status = 'published'
-- Nothing else.
