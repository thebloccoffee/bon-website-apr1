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
