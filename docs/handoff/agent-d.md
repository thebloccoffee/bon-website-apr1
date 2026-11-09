# Agent D handoff: SEO (AUDIT D1)

Branch `phase-2/agent-d`, based on hub 4073984.

## What it does

Every non-file, non-`/api` path is rewritten to `api/page.js`. That function fetches the built `index.html` from the same deployment (`https://<host>/index.html`, a static file that the rewrite never matches, so it can't loop), then swaps the block between `<!-- seo:start -->` and `<!-- seo:end -->` for the route's title, description, canonical, OG, Twitter and JSON-LD. Everyone gets this path, crawlers and people alike. The user-agent rule for social bots is gone.

- Static routes use copy from `src/lib/seo-routes.js`.
- `/journal/:slug` gets Article and BreadcrumbList data. The description falls back from excerpt to the first 160 characters of content.
- `/shop/:slug` gets Product and BreadcrumbList. The Offer is only included when `price_formatted` is a single CAD amount such as `$29` or `CA$29.00`. Anything else ("From $19", a range) leaves the price out.
- `/travel/:slug` gets BreadcrumbList.
- `/videos` gets an ItemList of VideoObject built from the `videos` table. If the table is missing, there is no list.
- `/` gets Person (with sameAs for both brands' IG and YT) and WebSite with a SearchAction pointing at `/search?q=`.
- If a slug isn't found, the response is a 404 with `noindex` (meta tag plus `X-Robots-Tag`), and the SPA shell is still served. A missing table counts as "not found", so `/shop/x` is a 404 today.
- If Supabase times out (2s) or errors, the response is a 200 with the section's copy. A real page never gets a 404 because of a hiccup.
- Unknown routes are 404 and noindex. `/search`, `/shop/thanks` and `/admin` are noindex.
- Cache headers: `s-maxage=300, stale-while-revalidate=86400` (404s use 60/600).
- Every value is HTML-escaped. JSON-LD escapes `<`, `>`, `&`, U+2028 and U+2029. Replacements use function replacers, so `$&` in a title stays literal.
- Supabase params are `encodeURIComponent`-ed. Env is `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, with the public values as fallback.

`/` is the one exception. Vercel serves the static `index.html` for it before any rewrite runs, so the default block in `index.html` is the home head. `tests/seo.test.mjs` fails if that block drifts from `renderHead(staticSeo('/'))`. If you change home copy in `seo-routes.js`, regenerate the block and paste it in.

## Files

| File | |
|---|---|
| `src/lib/seo-routes.js` | new. Shared route table, plain ESM, imported by both server and client (Vercel functions can import from `src/` as long as the file has no JSX, `@/` aliases or `import.meta.env`) |
| `server-lib/seo.js` | new. Resolve, Supabase REST, JSON-LD, render, inject |
| `api/page.js` | new. Head injection for every route |
| `api/sitemap.js` | new. Static routes plus published posts, products and destinations. lastmod uses `updated_at`, else `created_at`, and falls back automatically while `updated_at` doesn't exist yet |
| `api/og.js` | now a 308 compat redirect to `/journal/:slug` with a validated slug. Nothing routes to it any more |
| `public/robots.txt` | allows all; disallows `/admin`, `/api/`, `/shop/thanks`; has the Sitemap line |
| `vercel.json` | `trailingSlash: false`, permanent redirects (`/blog(/:slug)`, `/works`, `/destinations`, `/store`, `/luts`, `/points`, `/bon.points`), and rewrites. Agent F adds `headers` |
| `index.html` | head only: seo markers plus the home block |
| `src/components/shared/Seo.jsx` | `RouteSeo` (layout) and default `Seo` (page override) |
| `tests/seo.test.mjs` | `node tests/seo.test.mjs`, 19 checks, no network |

Rewrite syntax was checked against Vercel's path-to-regexp 6.1.0. `/:path((?!api/|assets/|.*\.[a-z0-9]+$).*)` matches `/`, `/journal/x` and `/shop/thanks`, and skips `/api/*`, `/assets/*` and anything with an extension (so `/robots.txt`, `/favicon.ico` and `/index.html` stay static).

## Outside my ownership (minimal)

- `src/components/layout/SiteLayout.jsx`: one import and `<RouteSeo />`.
- `src/lib/PageNotFound.jsx`: renders `<Seo title="Page not found" noindex />`. This is the soft-404 fix from 2b9e03d, done through Seo.

## For Agent A (pages): how to use Seo

`RouteSeo` already sets static-route copy on navigation. Dynamic pages should render `Seo` once their row loads, otherwise SPA navigation shows the section title ("Journal | Jon Bon Tabas"). A fresh page load is already correct from the server.

```jsx
import Seo from '@/components/shared/Seo';
// BlogPost
{post && <Seo title={post.title} description={post.excerpt} image={post.cover_image} type="article" />}
{notFound && <Seo title="Page not found" noindex />}
// Product: type="product"; TravelDestination: title={dest.name}
```

`title` is the page name, and the site name is appended. Props: `description`, `image`, `type`, `noindex`, `canonicalPath`, `jsonLd` (an array, which replaces the head's JSON-LD).

Internal linking, so crawlers find every page from HTML links (not only the sitemap):
- Post pages link to their destination (`/travel/<slug>`) and to two or three related posts with the same tag or location. Use real `<Link to>` anchors, not onClick navigation.
- Destination pages link to every post and video for that place.
- Brand pages link to their latest posts, videos and products. The footer links to both brands, `/travel`, `/journal`, `/videos` and `/shop`.
- Use descriptive anchor text (the post title) instead of "read more".

## Jon to fill / decide

- Only 6 of the 29 journal posts are `published`. The other 23 in URL-MAP are `draft`, so they now return 404 + noindex, and they were already "not found" in the SPA. Publish the ones that should rank.
- The anon key can read draft rows (that's how I counted them). This confirms AUDIT finding 1: run the RLS lockdown.
- Destination taglines on prod include "test" placeholder values that end up in descriptions.
- Prices are assumed to be CAD when `price_formatted` starts with `$`. Confirm.
- Vercel domain settings: make apex → www a 308 (URL-MAP).
- Preview deployments with Vercel Authentication: set `VERCEL_AUTOMATION_BYPASS_SECRET` (Protection Bypass for Automation), or `api/page.js` can't fetch its own `index.html` there and returns 503. Production is unaffected.

## Follow-ups

- After deploy: `curl -sI https://www.tabasjonbon.com/journal/natural-bridge`, check `/sitemap.xml` and `/journal/nope` (expect 404), then submit the sitemap in Search Console.
- Optional later: build-time prerender of `/journal/:slug` bodies (AUDIT D1 follow-up).
