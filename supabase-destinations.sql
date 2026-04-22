-- Run this in: supabase.com → your project → SQL Editor → paste → Run

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  slug text not null unique,
  continent text not null,
  region text,
  tagline text,
  description text,
  cover_image text,
  featured boolean default false,
  status text default 'published',
  tags text[],
  href text,
  "order" integer default 0
);

alter table destinations enable row level security;

create policy "Public can read published destinations"
  on destinations for select
  using (status = 'published');

create policy "Anon can manage destinations"
  on destinations for all
  using (true)
  with check (true);
