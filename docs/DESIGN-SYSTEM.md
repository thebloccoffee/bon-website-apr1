# Design system

The token layer already exists in `src/index.css` (`--font-size-*`, `--space-*`, `--radius-*`, `--motion-*`, `--color-*`) and is exposed to Tailwind as `tk-*` utilities in `tailwind.config.js`. Build on it. Do not add raw hex, px or ms values in components.

## Site-wide (hub + jooonbon + travel)

| Token | Value |
|---|---|
| Fonts | `--font-serif` Newsreader (headlines, editorial), `--font-sans` Inter (UI, body) |
| Theme | Dark first (`--background` black), light via the existing toggle (`use-theme`) |
| Type scale | `tk-xs` 10.5 → `tk-4xl` 24, `tk-display` clamp(3rem, 11vw, 8rem) |
| Spacing | `tk-1` 4 → `tk-8` 28 |
| Radius | `tk-xs` 6, `tk-pill` |
| Motion | instant 150, fast 200, normal 450 ms |

## Brand scopes

Add one attribute on the section wrapper: `<div data-brand="bonpoints">`. Under it, override only colour and font tokens.

| Scope | Overrides |
|---|---|
| `data-brand="jooonbon"` | none (site default) |
| `data-brand="bonpoints"` | bon.points v2 bible: Ink #0B0B0C, Graphite #1A1A1C, Ash #2C2B29, Smoke #8E8C88, Stone #C9C6C0, Bone #EEECE8. Inter only (no serif). No accent colour; emphasis by size and weight. Glass surface: white 12%, 26px backdrop blur, 1.5px white 28% border, 1px inner highlight. Wordmark "bon" SemiBold + "points" Medium Italic. |

Source of truth for bon.points: `~/Desktop/02 AREAS/06 Travel & Points/Points & Bookings/bonpoints/BRAND-BIBLE.md` and `brand-v2/logo/svg` (copy the SVGs into `public/brands/bonpoints/`).

## Shared components (new, in `src/components/shared/`)

| Component | Props | Notes |
|---|---|---|
| `SiteHeader` | none | Evolve `layout/Navigation.jsx`; nav per SITEMAP.md, search icon |
| `SiteFooter` | none | Evolve `layout/SiteFooter.jsx`; legal links, both YT channels, `NewsletterForm` |
| `VideoCard` | `video`, `size` | Thumbnail `i.ytimg.com/vi/<id>/hqdefault.jpg`, play button, swaps to `youtube-nocookie.com` iframe on click |
| `ProductCard` | `product` | Image, name, CAD price, link to `/shop/:slug` |
| `PostCard` | `post` | Extract from `home/FeaturedPosts.jsx` |
| `BrandDoor` | `brand` | Big tile on Home linking to `/jooonbon` or `/bonpoints` |
| `NewsletterForm` | `source`, `brand` | Email + required unticked consent checkbox, writes `email_signups` |
| `Disclosure` | `kind` = affiliate / not-advice | Short inline note + link to `/disclosures` |
| `SectionHeader` | `eyebrow`, `title`, `action` | Matches current Journal/Destinations headers |
| `Seo` | `title`, `description`, `image`, `jsonLd` | Client-side head updates; server injection covers first paint (AUDIT D1) |
