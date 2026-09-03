# Shop setup

Selling LUTs, presets, guides and courses through Stripe Payment Links.
Payment happens on Stripe. Delivery happens here, on your own branded success
page, from a private Supabase bucket.

## Managed Payments: on or off?

This is a toggle on the Payment Link, and the code works either way.

| | Managed Payments ON | OFF (standard) |
|---|---|---|
| Stripe is merchant of record | yes — they file and remit your VAT/GST | no — that stays yours |
| GCash, Maya, other PH wallets | **not supported** | supported |
| Fee on a $39 sale | ~$2.80 | ~$1.43 |

**Recommended: OFF, because the audience is Philippine.** Managed Payments
supports only cards, Apple/Google Pay, Link, and a short list of regional
methods — nothing Philippine. With roughly 44% of Filipinos unbanked and 94M on
GCash, turning it on would price out most of the audience to save tax
paperwork you probably do not owe yet: Canada's small-supplier threshold is
CAD 30k and the Philippine digital-services VAT threshold is PHP 3M.

Revisit if EU sales grow. EU B2C digital VAT is owed from the first euro with
no threshold, and that is where merchant-of-record earns its 3.5%.

Enable GCash under Stripe → Settings → Payment methods. It may require PHP
presentment, so either price in PHP or turn on Adaptive Pricing.

## Flow

```
/shop                    grid, from shop_products
/shop/:slug              detail page, before/after slider, Buy button
  ↓ Buy click            straight to the Stripe Payment Link (no SDK, no script tag)
  ↓ payment              handled entirely by Stripe
  ↓ redirect back        /shop/success?session_id=cs_live_...
  ↓ checkout.session.completed
                         webhook → POST /api/stripe-webhook  ← the only source of truth
       verify HMAC over raw body, reject timestamps older than 5 min
       ignore anything whose payment_status is not 'paid'
       insert shop_orders (deduped on stripe_session_id)
       mint one shop_grants row per file: random token, 30d expiry, 15 uses
       email the links via Resend
/shop/success            polls /api/order until the webhook lands, shows downloads
  ↓ download click       GET /api/download?token=… → 302 to a 5-minute signed URL
```

The redirect is a UI hint only. Nothing is delivered on the strength of it —
entitlement comes from the signature-verified webhook. This matters more with
GCash than with cards: redirect wallets can bounce the buyer back before the
funds settle, so the webhook checks `payment_status === 'paid'` rather than
trusting that the buyer arrived on the success page.

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
| `STRIPE_SECRET_KEY` | yes | Stripe → Developers → API keys → secret key (`sk_live_...`). Used to look up what was bought. |
| `STRIPE_WEBHOOK_SECRET` | yes | Stripe hands you this (`whsec_...`) when you create the webhook endpoint. |
| `RESEND_API_KEY` | optional | Emailed backup copy of the download links. Without it the success page still works. |
| `SHOP_FROM_EMAIL` | optional | e.g. `Jon Bon <shop@tabasjonbon.com>`. Needs a domain verified in Resend. |
| `ADMIN_PASSWORD` | yes | Server-side admin password. See `SECURITY-FIX.md`. |
| `ADMIN_SESSION_SECRET` | yes | 40+ random chars, signs the admin session cookie. |

`VITE_SUPABASE_URL` is already set from the existing contact form.

## 3. Stripe

1. Create a product: Stripe → Product catalogue → **Add product**. Set the real
   price here; the site only shows `price_formatted` as display text.
2. Assign a **tax code** on the product — required if you ever enable Managed
   Payments, harmless otherwise:
   - LUTs / presets → `txcd_10505001` (Digital Finished Artwork)
   - Travel guide PDF → `txcd_10302000` (Digital Books)
   - Video course → `txcd_20060258` (On-demand Online Courses)
3. Copy the **Price ID** (`price_1ABC...`) from the product page.
4. Payment Links → **New** → pick the product. Under *After payment*, choose
   **Redirect to a page** and set:
   `https://www.tabasjonbon.com/shop/success?session_id={CHECKOUT_SESSION_ID}`
   Stripe substitutes the real id. Without this the buyer never reaches the
   download page.
5. Skip Stripe's own file delivery. Files are served from your bucket so the
   download page stays yours.
6. Copy the link URL (`https://buy.stripe.com/...`).
7. Developers → Webhooks → **Add endpoint**:
   - URL `https://www.tabasjonbon.com/api/stripe-webhook`
   - Events `checkout.session.completed`, `charge.refunded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

## 4. Upload the deliverables

Supabase → Storage → `shop-files` (private). Upload e.g. `luts/travel-v2.zip`.
Note the path — that is `storage_path` below.

## 5. Add a product

```sql
insert into shop_products (slug, title, subtitle, description, category,
  price_formatted, cover_image, before_image, after_image, features,
  stripe_price_id, checkout_url, "order")
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
  'price_1ABCdefGHIjklMNO',
  'https://buy.stripe.com/aEUcNW1234567890',
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
- **Stripe** — paste the Payment Link URL and the Price ID from your Stripe
  dashboard. The real price lives in Stripe; `price_formatted` here is display
  text only, so if you change the price, change it in both places.
- **Before / After images** — set both and the product page renders a
  drag-to-compare slider instead of a still. This is the whole pitch for a LUT.
- **Files delivered on purchase** — save the product once, then upload. Files go
  straight into the private `shop-files` bucket; buyers only ever reach them
  through a signed URL minted at download time.
- **Draft status** — hides a product from `/shop` while you write it.

The product list flags anything unsellable: `no buy link` means the Buy button
will render as "Coming soon" until you paste the Payment Link URL.

## 6. Test before going live

Flip Stripe to **test mode**, rebuild the product, price, payment link and
webhook there, and buy with card `4242 4242 4242 4242`. Check: the link opens,
the success page resolves within a few seconds, the download works, the email
arrives. Test orders are flagged `test_mode = true` in `shop_orders` — delete
them before launch.

Test-mode objects are separate from live ones, so remember to swap
`checkout_url`, `stripe_price_id` and the webhook secret back to live values.

## Refunds

Refunding in Stripe fires `charge.refunded`, matched back to the order by
`payment_intent`. Grants are expired and the order marked refunded, so the
buyer's links stop working immediately.

## Worth knowing

Payment lives behind one component (`BuyButton`) and one webhook. This shop was
originally built against Lemon Squeezy and moved to Stripe by rewriting exactly
those two files — the product pages, admin, delivery and download flow were
untouched. Keep it that way.

`price_formatted` on the product is display text only. Change a price in Stripe
and you must change it here too, or the page will advertise the wrong number.
