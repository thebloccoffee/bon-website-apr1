// Thanks-page lookup: GET /api/order?session_id=cs_...
//
// Stripe puts the checkout session id (long, unguessable) in the return URL,
// so it acts as the bearer for the receipt. Download tokens are separate and
// revocable, so a leaked receipt link does not hand over permanent access.
//
// Always 200 with a `status` the page can act on:
//   paid        files ready (files[] may be empty if none are attached yet)
//   pending     payment made with a delayed method (e.g. GCash), not settled yet
//   confirming  Stripe says paid but the webhook has not landed, or unknown
//   unpaid      checkout was never completed
//   failed      the delayed payment failed
//   refunded    order refunded, links revoked

import { db, json, stripeGet, SESSION_ID_RE } from '../server-lib/shop.js';

export const config = { runtime: 'edge' };

const enc = encodeURIComponent;

// No order row yet. Ask Stripe what state the session is in so the page can
// tell "still processing" apart from "webhook is a few seconds behind".
async function statusFromStripe(sessionId) {
  if (!process.env.STRIPE_SECRET_KEY) return 'confirming';
  try {
    const s = await stripeGet(`checkout/sessions/${enc(sessionId)}`);
    if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') return 'confirming';
    if (s.status === 'complete') return 'pending';
    return 'unpaid';
  } catch {
    return 'confirming';
  }
}

export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!SESSION_ID_RE.test(sessionId)) return json({ error: 'Bad request' }, 400);

  try {
    const rows = await db(
      `shop_orders?stripe_session_id=eq.${enc(sessionId)}` +
        `&select=id,order_number,name,status,shop_products(title,slug,cover_image)`
    );
    const order = rows?.[0];
    if (!order) return json({ status: await statusFromStripe(sessionId) });

    if (order.status !== 'paid') {
      return json({ status: order.status || 'confirming', order_number: order.order_number });
    }

    const grants = await db(
      `shop_grants?order_id=eq.${enc(order.id)}` +
        `&select=token,expires_at,max_uses,used_count,shop_product_files(label,size_label)` +
        `&order=created_at.asc`
    );
    const now = Date.now();

    return json({
      status: 'paid',
      order_number: order.order_number,
      first_name: order.name ? String(order.name).trim().split(/\s+/)[0] : null,
      product: order.shop_products ?? null,
      files: (grants || []).map((g) => ({
        label: g.shop_product_files?.label ?? 'Download',
        size_label: g.shop_product_files?.size_label ?? null,
        url: `/api/download?token=${g.token}`,
        expires_at: g.expires_at,
        expired: new Date(g.expires_at).getTime() < now,
        remaining: Math.max(0, (g.max_uses ?? 0) - (g.used_count ?? 0)),
      })),
    });
  } catch (e) {
    console.error('[order]', e);
    return json({ error: 'Lookup failed' }, 500);
  }
}
