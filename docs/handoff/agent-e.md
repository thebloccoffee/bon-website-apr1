# Agent E handoff: shop

Branch `phase-2/agent-e`, from `hub` at 4073984. Setup steps for the owner are in `SHOP-SETUP.md`.

## Done

Backend, ported from `shop-and-security-fix` onto the hub conventions:
- `server-lib/shop.js` replaces `api/_shop-lib.js`. It holds the Supabase REST and storage calls, Stripe signature checks (5-minute window, accepts any matching `v1` signature) and input format checks.
- `api/stripe-webhook.js` verifies the signature before parsing and handles repeat events safely. A GCash checkout that completes before settling is saved as `pending` and gets its files on `async_payment_succeeded`. A failed GCash payment marks the order `failed`. Only a full refund revokes links. Names and titles are HTML-escaped in the email.
- `api/order.js` always answers with a status: `paid`, `pending`, `confirming`, `unpaid`, `failed` or `refunded`. With no order row yet it asks Stripe. It returns the buyer's first name only, never the email.
- `api/download.js` checks the token format, expiry and the 15-use limit, then redirects to a 5-minute signed URL.
- `api/admin-shop.js` (behind `requireAdmin`) lists, uploads and deletes files in the private `shop-files` bucket and lists the last 100 orders.
- `tests/shop/`: 17 tests that run the real handlers against a fake Supabase and Stripe. Run them with `npm run test:shop`.

Frontend:
- `src/pages/Shop.jsx`: grid with brand and category filters (filters only show when there's more than one option).
- `src/pages/Product.jsx`: before/after slider or cover, gallery, Markdown description, features, FAQ, Buy button. bon.points products render inside `data-brand="bonpoints"`. Passes Product and FAQPage JSON-LD to `Seo`.
- `src/pages/ShopThanks.jsx`: polls `/api/order` every 1.5 s while `confirming` and every 10 s while `pending`, and shows expired or used-up links as disabled.
- `src/components/shared/ProductCard.jsx` (prop `product`).
- `src/components/shop/`: `BuyButton`, `BeforeAfter`, `Markdown` (react-markdown, raw HTML skipped), `ProductFaq`, `shopMeta`, `shopAdmin` (client for `/api/admin-shop`).
- `src/components/admin/ProductsEditor.jsx`: product form, FAQ editor, file uploads, read-only Orders view. It sends only the editable columns, never `search`, `id` or `created_at`.

Also `SHOP-SETUP.md`, `supabase/seed/products.sql` (two placeholder drafts) and a `test:shop` script in `package.json`.

## Checks

- `npm run test:shop`: 17 of 17 pass.
- `npm run build`: passes.
- eslint: no errors in any file this branch touches. The remaining `npm run lint` errors are unused imports in other agents' stubs.
- Viewed `/shop`, `/shop/:slug` and `/shop/thanks` at 390px and 1280px with mocked data. No horizontal scroll. Not tested against a real Stripe account.

## For other agents

- `Seo` (Agent D) is still a stub, so the shop pages' titles and JSON-LD don't appear yet. They use the documented props `title`, `description`, `image`, `jsonLd`, where `jsonLd` may be an object or an array.
- `ProductCard` is ready for brand pages: `getProducts({ brand, featured: true })` from `src/api/content.js`.
- The product page links to `/refunds`, which needs a page (SITEMAP lists it).
- The site-wide cookie banner overlaps the product title on a 390px screen until it's dismissed.

## Owner decisions and actions

- Add `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` to the Stripe webhook.
- Change each Payment Link's redirect to `/shop/thanks?session_id={CHECKOUT_SESSION_ID}`.
- Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (or `VITE_SUPABASE_URL`). `RESEND_API_KEY` and `SHOP_FROM_EMAIL` are optional.
- Decide GST/PST: Stripe Tax or manual.
- Seed product copy, prices and Stripe IDs are placeholders.
- Files over 50 MB will likely fail on the Supabase free plan. The editor blocks them before uploading.
- Deleting a product cascades its file rows but leaves the files in storage. Delete files first if you want the bucket clean.
