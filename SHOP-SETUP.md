# Shop setup

Selling LUTs, presets and travel guides. Lemon Squeezy is the merchant of
record — they are the legal seller, so they collect and remit VAT/sales tax
worldwide. You never register for tax in another country.

Payment happens on Lemon Squeezy. Delivery happens here, on your own branded
success page, from a private Supabase bucket.

## Flow

```
/shop                    grid, from shop_products
/shop/:slug              detail page, before/after slider, Buy button
  ↓ Buy click            lemon.js overlay opens IN PAGE (no redirect away)
  ↓ payment              handled entirely by Lemon Squeezy
  ↓ Checkout.Success     browser event → navigate to /shop/success?order=<identifier>
  ↓ order_created        webhook → POST /api/ls-webhook  ← the only source of truth
       verify HMAC over raw body
       insert shop_orders (deduped on ls_order_id)
       mint one shop_grants row per file: random token, 30d expiry, 15 uses
       email the links via Resend
/shop/success            polls /api/order until the webhook lands, shows downloads
  ↓ download click       GET /api/download?token=… → 302 to a 5-minute signed URL
```

The browser event is a UI hint only. Nothing is delivered on the strength of it —
entitlement comes from the signature-verified webhook.

## 1. Database

Run `supabase-shop.sql` in the Supabase SQL editor. It creates the four tables
and the private `shop-files` bucket.

Only `shop_products` is publicly readable. `shop_product_files`, `shop_orders`
and `shop_grants` have RLS on with **no policies** — deny-all — so they are
reachable only with the service-role key from the serverless functions.
Do not add anon policies to those three.

## 2. Environment variables (Vercel → Settings → Environment Variables)

| Name | Required | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → Settings → API → `service_role`. **Never** prefix with `VITE_` — that would ship it in the browser bundle and hand everyone full database access. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | yes | Any random 20–40 char string; paste the same one into the Lemon Squeezy webhook form. |
| `RESEND_API_KEY` | optional | Emailed backup copy of the download links. Without it the success page still works. |
| `SHOP_FROM_EMAIL` | optional | e.g. `Jon Bon <shop@tabasjonbon.com>`. Needs a domain verified in Resend. |
| `ADMIN_PASSWORD` | yes | Server-side admin password. See `SECURITY-FIX.md`. |
| `ADMIN_SESSION_SECRET` | yes | 40+ random chars, signs the admin session cookie. |

`VITE_SUPABASE_URL` is already set from the existing contact form.

## 3. Lemon Squeezy

1. Create a store at lemonsqueezy.com and complete payout details.
2. Create one product per item. Set the price there — the site only shows
   `price_formatted` as display text.
3. Skip Lemon Squeezy's own file delivery. Files are served from your bucket so
   the download page stays yours.
4. Copy each product's **Share / buy link** (`https://STORE.lemonsqueezy.com/buy/UUID`)
   and its **variant ID**.
5. Settings → Webhooks → add:
   - URL `https://www.tabasjonbon.com/api/ls-webhook`
   - Events `order_created`, `order_refunded`
   - Signing secret = `LEMONSQUEEZY_WEBHOOK_SECRET`

## 4. Upload the deliverables

Supabase → Storage → `shop-files` (private). Upload e.g. `luts/travel-v2.zip`.
Note the path — that is `storage_path` below.

## 5. Add a product

```sql
insert into shop_products (slug, title, subtitle, description, category,
  price_formatted, cover_image, before_image, after_image, features,
  ls_variant_id, ls_buy_url, "order")
values (
  'travel-luts-v2',
  'Travel LUTs v2',
  'Twelve looks built on three years of location work.',
  'The exact grades behind the films...',
  'lut',
  '$39',
  'https://.../cover.jpg',
  'https://.../ungraded.jpg',
  'https://.../graded.jpg',
  array['12 .cube files', 'Rec.709 + LOG variants', 'Resolve, Premiere, FCP'],
  '123456',
  'https://YOURSTORE.lemonsqueezy.com/buy/abc-uuid',
  1
);

insert into shop_product_files (product_id, label, storage_path, size_label)
select id, 'Travel LUTs v2 (.zip)', 'luts/travel-v2.zip', '48 MB'
from shop_products where slug = 'travel-luts-v2';
```

## Editing the shop day to day

Everything below step 4 can be done from the browser instead of SQL:

**`/admin` → Shop tab.**

- **New product** — title, subtitle, description, category, display price, and
  the "what's included" list.
- **Lemon Squeezy** — paste the buy link and variant ID from your LS dashboard.
  The real price lives in Lemon Squeezy; `price_formatted` here is display text
  only, so if you change the price, change it in both places.
- **Before / After images** — set both and the product page renders a
  drag-to-compare slider instead of a still. This is the whole pitch for a LUT.
- **Files delivered on purchase** — save the product once, then upload. Files go
  straight into the private `shop-files` bucket; buyers only ever reach them
  through a signed URL minted at download time.
- **Draft status** — hides a product from `/shop` while you write it.

The product list flags anything unsellable: `no buy link` means the Buy button
will render as "Coming soon" until you paste the Lemon Squeezy URL.

## 6. Test before going live

Turn on **test mode** in Lemon Squeezy and buy your own product with card
`4242 4242 4242 4242`. Check: overlay opens in-page, success page resolves
within a few seconds, download works, email arrives. Test orders are flagged
`test_mode = true` in `shop_orders` — delete them before launch.

## Refunds

Refunding in Lemon Squeezy fires `order_refunded`, which expires the grants and
marks the order refunded. The buyer's links stop working immediately.

## Worth knowing

Stripe acquired Lemon Squeezy in 2024 and is steering users toward Stripe
Managed Payments. No shutdown date has been announced and signups are open, but
this is why payment lives behind one component (`BuyButton`) and one webhook —
switching merchant of record later means rewriting those two files, not the shop.
