-- Run this entire file in:
-- supabase.com → your project → SQL Editor → paste → Run

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image text,
  gallery text[],
  location text,
  coordinates text,
  date_traveled date,
  status text default 'published',
  tags text[]
);

create table if not exists portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  description text,
  thumbnail text,
  gallery text[],
  video_url text,
  location text,
  category text,
  year text,
  client text,
  "order" integer default 0
);

create table if not exists contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  project_type text,
  location text,
  "when" text,
  message text
);

-- Allow anyone to read published blog posts and portfolio projects
alter table blog_posts enable row level security;
alter table portfolio_projects enable row level security;
alter table contact_inquiries enable row level security;

create policy "Public can read published posts"
  on blog_posts for select
  using (status = 'published');

create policy "Public can read portfolio"
  on portfolio_projects for select
  using (true);

create policy "Public can submit contact"
  on contact_inquiries for insert
  with check (true);

-- Admin (your app) can do everything — uses service role key which bypasses RLS
-- No extra policies needed for admin writes since you'll use the anon key from the app.
-- To allow admin writes from the anon key, add these:

create policy "Anon can manage blog posts"
  on blog_posts for all
  using (true)
  with check (true);

create policy "Anon can manage portfolio"
  on portfolio_projects for all
  using (true)
  with check (true);

create policy "Anon can read inquiries"
  on contact_inquiries for select
  using (true);
