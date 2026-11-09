# Repo audit (Phase 1, 2026-11-08)

Repo: `thebloccoffee/bon-website-apr1` → Vercel → www.tabasjonbon.com (apex 307s to www).
Local build output matches production byte for byte (`index-CfbjB2Z5.js`).

## Stack

| Layer | What is there |
|---|---|
| Framework | Vite 6 + React 18 SPA, react-router-dom 6 (client-side routing only) |
| Styling | Tailwind 3 + shadcn/ui (49 components in `src/components/ui`), framer-motion |
| Data | Supabase `jgmthehikpgcjbchlmug` via `@supabase/supabase-js` (anon key in the browser) |
| Server | Vercel functions in `/api` (Node), shared helper `server-lib/adminAuth.js` |
| Email | `api/contact.js` (nodemailer + Gmail app password) |
| Analytics | Metricool tracker inline in `index.html` |
| Origin | Exported from Base44; `base44/` entity files and `@base44/vite-plugin` are leftovers, unused by the build |

## Routes today

| URL | Page | Data |
|---|---|---|
| `/` | Home (hero, featured posts, portfolio preview) | blog_posts, portfolio_projects |
| `/journal` | Journal list + destination filter | blog_posts, destinations |
| `/journal/:slug` | Blog post | blog_posts |
| `/portfolio` | Works | portfolio_projects |
| `/contact` | Inquiry form | inserts contact_inquiries, calls `/api/contact` |
| `/admin` | Password-gated CMS (posts, portfolio, destinations) | `/api/admin-*` with service role |
| `*` | 404 | |

`src/pages/Destinations.jsx` exists but has **no route**. Its data is used inside Journal.

`vercel.json`: social-crawler user agents on `/journal/:slug` get `/api/og` (server-rendered OG tags); everything else rewrites to `/`.

## Supabase (live counts)

| Table | Rows | Notes |
|---|---|---|
| blog_posts | 30 | slug, title, excerpt, content (HTML), cover_image, gallery[], location, city, coordinates, date_traveled, status, tags[] |
| portfolio_projects | 4 | YouTube URLs in video_url, category `event_highlights` |
| destinations | 3 | xiamen, vancouver-bc, philippines |
| contact_inquiries | 4 | |

Storage bucket: `media` (public read).

## Environment variables

| Name | Where |
|---|---|
| VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | browser + `/api/og` (falls back to hard-coded values in `src/api/supabaseClient.js`) |
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | `/api/admin-*` |
| ADMIN_PASSWORD, ADMIN_SESSION_SECRET | admin login |
| GMAIL_APP_PASSWORD | contact email |

## Findings, by severity

1. **CRITICAL: RLS lockdown never ran on production.** The public anon key can `SELECT` every row of `contact_inquiries` (names, emails, messages). The old "Anon can manage blog posts / portfolio / destinations" policies are therefore almost certainly still live too, which means anyone can edit or delete site content. Fix: run `supabase-migration-rls-lockdown.sql` in the Supabase SQL editor, then run its verification query, then check `media` bucket storage policies as the file describes. Owner action, needs dashboard access.
2. **SEO: client-rendered SPA.** Every URL ships the same `<title>` and description. Only social crawlers on `/journal/:slug` get real tags. No sitemap.xml, robots.txt, canonical tags or JSON-LD. See decision D1 below.
3. **`/api/og` builds HTML from DB values without escaping**, and interpolates `slug` straight into the Supabase query string. Escape output, `encodeURIComponent` the slug.
4. Hard-coded Supabase fallback values in `supabaseClient.js`. The anon key is public by design, but env vars should be the only source.
5. Base44 leftovers (`base44/`, `@base44/vite-plugin`, README). Safe to remove in Phase 2.
6. Cookie banner exists while analytics is Metricool (sets cookies). Agent F decides: keep banner, or move to cookieless analytics and drop it.

## Decisions for Phase 2

**D1. Keep Vite, add server-side head injection.** No Next.js migration. Generalise `/api/og` into one function that serves `index.html` with the correct `<title>`, description, canonical, OG and JSON-LD for every route and every visitor (not only bots), plus `/api/sitemap` for `sitemap.xml`. Googlebot still renders the JS for body content. If rankings need full HTML bodies later, add build-time prerender of `/journal/:slug` as a follow-up.

**D2. Keep every existing URL.** `/journal` is the Blog/Guides section, `/portfolio` stays as Works. New sections are additive, so URL-MAP has zero breaking redirects.

**D3. Payments provider: open.** Lemon Squeezy is merchant of record (handles GST/PST and foreign VAT for you). Stripe Payment Links are cheaper but you register and remit sales tax yourself. Stan Store is already in the LUT funnel; the site can link to it instead of running its own checkout. Owner decides before Agent E starts.
