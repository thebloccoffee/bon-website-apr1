-- Add the `city` column used by the admin "City / Specific Place" field.
-- The admin editor now includes `city` in its save payload, but the column
-- was never in the original schema, so values had nowhere to land.
--
-- Run in: supabase.com → your project → SQL Editor → paste → Run

alter table blog_posts add column if not exists city text;
