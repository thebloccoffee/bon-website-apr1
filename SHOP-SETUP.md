# Shop setup

> **Current setup (2026-11-08): checkout on Stan Store.** The site is the shop window: product pages live on jooonbon.com and the Buy button opens the product's Stan link (paste it in /admin → Products → Buy link). Stan handles payment, delivery, email capture and upsells. Nothing below needs setting up unless a product uses a Stripe Payment Link instead; the Stripe flow is built and tested but dormant.

Products sell through Stripe Payment Links. Stripe takes the payment, then sends the buyer back to `/shop/thanks` on this site, where the files download from a private Supabase bucket.

## How an order flows

```
/shop                 grid of published shop_products
/shop/:slug           product page, before/after slider, Buy button
  Buy                 goes straight to the Payment Link (no Stripe SDK on the site)
  Stripe redirect     /shop/thanks?session_id=cs_live_...
  Stripe webhook      POST /api/stripe-webhook   (the only thing that grants files)
    verify signature over the raw body, reject timestamps older than 5 minutes
    insert shop_orders, deduped on stripe_session_id
    paid now            -> status paid, one shop_grants row per file (30 days, 15 downloads)
    paid later (GCash)  -> status pending, grants minted on async_payment_succeeded
    GCash fails         -> status failed
    full refund         -> status refunded, grants expire at once
    partial refund      -> links keep working
    email the links via Resend if configured
/shop/thanks          polls /api/order and shows the downloads
/api/download?token=  checks expiry and use count, then 302 to a 5-minute signed URL
```

Landing on the thanks page proves nothing. A wallet like GCash can send the buyer back before the money settles, so the page reports `pending` and keeps polling every 10 seconds until the webhook marks the order paid.

## 1. Database

Run both migrations in order in the Supabase SQL editor:

1. `supabase/migrations/20261108_1_shop.sql` (tables, private `shop-files` bucket, RLS)
2. `supabase/migrations/20261108_2_hub_schema.sql` (brand, faq, featured, search)

Only published `shop_products` rows are public. `shop_product_files`, `shop_orders` and `shop_grants` have RLS on with no policies, so only the server functions (service role key) can read them. Do not add anon policies to those three.

Optional: `supabase/seed/products.sql` adds two draft products to try the admin and product pages with.

## 2. Environment variables (Vercel, Settings, Environment Variables)

| Name | Required | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_live_...`. The webhook uses it to read line items; `/api/order` uses it to tell "still processing" from "not paid". |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_...`, shown when you create the webhook endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Never prefix it with `VITE_`. That would ship it in the browser bundle. |
| `SUPABASE_URL` | yes | Or `VITE_SUPABASE_URL`, which is already set. |
| `RESEND_API_KEY` | optional | Turns on the email copy of the download links. The thanks page works without it. |
| `SHOP_FROM_EMAIL` | optional | e.g. `Jon Bon <shop@jooonbon.com>`. The domain must be verified in Resend. |
| `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` | yes | Already used by `/admin`. |

## 3. Stripe

1. Product catalogue, Add product. Set the real price here. The site's `price_formatted` is display text only, so change both when the price changes.
2. Copy the Price ID (`price_1...`). The webhook matches line items to products on this.
3. Payment Links, New, pick the product. Under After payment, choose to redirect customers to your website, and set:
   `https://jooonbon.com/shop/thanks?session_id={CHECKOUT_SESSION_ID}`
   The old branch used `/shop/success`. That path no longer exists.
4. Skip Stripe's own file delivery. Files come from your bucket.
5. Developers, Webhooks, Add endpoint:
   - URL `https://jooonbon.com/api/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`
6. For GCash: Settings, Payment methods, enable GCash. It may need PHP presentment, so either price in PHP or turn on Adaptive Pricing. Without the two `async_payment_*` events, GCash buyers would stay `pending` forever.

## 4. Sales tax (GST/PST): decision needed

Stripe is not the merchant of record here, so collecting and remitting tax is on you. Pick one before launch:

- Stripe Tax: register in Stripe, turn on "Collect tax automatically" on each Payment Link, and give each product a tax code (LUTs and presets `txcd_10505001`, PDF guides `txcd_10302000`). Stripe charges a fee per transaction.
- Manual: leave tax off while under the small-supplier threshold (CAD 30k over four quarters), and register once you pass it.

The product page says "Taxes shown at checkout", which is true either way.

## 5. Adding a product

Use `/admin`, Products tab:

- Fill in title, brand, category, subtitle, description (Markdown) and the display price.
- Paste the Payment Link URL and the Price ID.
- Set a cover image, or both before and after images to get the drag-to-compare slider.
- Save once, then upload the files under "Files delivered on purchase". They go to the private `shop-files` bucket. On the Supabase free plan each file is capped at 50 MB, so split or compress anything bigger.
- Switch status to Published when it's ready. New products start as Draft.

The list flags products with `no buy link` or `no price ID`. Without a buy link the button says "Coming soon". Without a price ID a sale can't be matched to its files.

The editor only sends the editable columns. `search` is generated by Postgres and `id`/`created_at` belong to the database, so a whole-row save would fail.

A product that has orders can't be deleted (orders reference it). Set it to Draft instead. Removing a file deletes it from storage, and past buyers lose that one link.

The Orders view in the same tab lists the latest 100 orders, read only.

## 6. Test before going live

Switch Stripe to test mode and recreate the product, price, Payment Link and webhook there. Buy with card `4242 4242 4242 4242`, then check that the thanks page shows the files within a few seconds, the download works, and the email arrives. Test orders are saved with `test_mode = true`; delete them before launch. Then swap `checkout_url`, `stripe_price_id` and the webhook secret back to the live values.

Backend tests run without network access against a fake Supabase and Stripe:

```
npm run test:shop
```
