// Stripe webhook. This is the ONLY thing that grants downloads — the browser
// returning to /shop/success is a UI hint, never proof of payment.
//
// Edge runtime is deliberate: it is the one Vercel runtime where the exact raw
// request bytes are reachable (await request.text()). The Node runtime parses
// the body first, and re-serialising it breaks the signature.
//
// Configure in Stripe -> Developers -> Webhooks:
//   URL:    https://www.tabasjonbon.com/api/stripe-webhook
//   Events: checkout.session.completed, charge.refunded
//   Secret: whsec_... -> STRIPE_WEBHOOK_SECRET

import { db, randomToken, json } from './_shop-lib.js';

export const config = { runtime: 'edge' };

const GRANT_DAYS = 30;
const GRANT_MAX_USES = 15;
const SIGNATURE_TOLERANCE_SECONDS = 300;

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Stripe-Signature: "t=1614903320,v1=abc...,v1=def..."
// The signed payload is `${timestamp}.${rawBody}`. The timestamp check is what
// stops someone replaying a captured request days later.
export async function verifyStripeSignature(header, rawBody, secret) {
  if (!header) return false;

  const parts = Object.create(null);
  const signatures = [];
  for (const piece of header.split(',')) {
    const [k, v] = piece.split('=');
    if (k === 'v1') signatures.push(v);
    else parts[k] = v;
  }

  const timestamp = Number(parts.t);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((sig) => timingSafeEqual(expected, sig));
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`stripe ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sendDownloadEmail({ to, name, productTitle, orderNumber, links }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHOP_FROM_EMAIL;
  // Email is a convenience copy. If it is not configured we still return 200 —
  // the buyer already has their files on the success page.
  if (!apiKey || !from || !to) return;

  const buttons = links
    .map(
      (l) => `<tr><td style="padding:8px 0;">
        <a href="${l.url}" style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">${l.label}</a>
        ${l.size_label ? `<span style="color:#999;font-size:12px;margin-left:12px;">${l.size_label}</span>` : ''}
      </td></tr>`
    )
    .join('');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `Your download — ${productTitle}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#111;">
        <h2 style="font-weight:300;font-size:28px;margin-bottom:8px;">Thank you${name ? `, ${name}` : ''}.</h2>
        <p style="font-size:16px;line-height:1.7;color:#444;">Order ${orderNumber} — <strong>${productTitle}</strong></p>
        <table style="width:100%;margin-top:24px;">${buttons}</table>
        <p style="font-size:13px;color:#999;margin-top:32px;">
          These links work for ${GRANT_DAYS} days and up to ${GRANT_MAX_USES} downloads.
          Save the files somewhere safe once you have them. Reply to this email if anything goes wrong.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
        <p style="font-size:12px;color:#999;">tabasjonbon.com</p>
      </div>`,
    }),
  });
}

async function handleRefund(charge) {
  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!paymentIntent) return json({ ok: true, ignored: 'no payment_intent' });

  const existing = await db(
    `shop_orders?payment_intent=eq.${encodeURIComponent(paymentIntent)}&select=id`
  );
  if (!existing?.[0]) return json({ ok: true, ignored: 'unknown order' });

  // Kill the download links rather than deleting the record.
  await db(`shop_grants?order_id=eq.${existing[0].id}`, {
    method: 'PATCH',
    body: { expires_at: new Date(0).toISOString(), max_uses: 0 },
  });
  await db(`shop_orders?id=eq.${existing[0].id}`, {
    method: 'PATCH',
    body: { status: 'refunded' },
  });
  return json({ ok: true, refunded: true });
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook not configured' }, 500);

  // Verify over the raw bytes BEFORE parsing or touching the database.
  const raw = await request.text();
  const ok = await verifyStripeSignature(request.headers.get('stripe-signature'), raw, secret);
  if (!ok) return json({ error: 'Invalid signature' }, 401);

  const event = JSON.parse(raw);

  if (event.type === 'charge.refunded') {
    return handleRefund(event.data.object);
  }

  if (event.type !== 'checkout.session.completed') {
    return json({ ok: true, ignored: event.type });
  }

  const session = event.data.object;

  // Async payment methods (GCash and other redirect wallets) can complete the
  // session before the funds settle. Only 'paid' is proof.
  if (session.payment_status !== 'paid') {
    return json({ ok: true, ignored: `payment_status=${session.payment_status}` });
  }

  // Stripe retries on non-200. Make replays harmless.
  const dupe = await db(
    `shop_orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&select=id`
  );
  if (dupe?.[0]) return json({ ok: true, deduped: true });

  // line_items are not included in the event payload; fetch them to learn what
  // was actually bought rather than trusting anything client-supplied.
  let priceId = null;
  try {
    const lineItems = await stripeGet(`checkout/sessions/${session.id}/line_items?limit=1`);
    priceId = lineItems?.data?.[0]?.price?.id ?? null;
  } catch {
    // Fall through to the slug match below.
  }

  let product = priceId
    ? (await db(
        `shop_products?stripe_price_id=eq.${encodeURIComponent(priceId)}&select=id,title`
      ))?.[0]
    : null;

  // Fallback: a slug set in the payment link's metadata.
  const slug = session.metadata?.product_slug;
  if (!product && slug) {
    product = (await db(
      `shop_products?slug=eq.${encodeURIComponent(slug)}&select=id,title`
    ))?.[0];
  }

  const inserted = await db('shop_orders', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      stripe_session_id: session.id,
      payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      identifier: randomToken(16),   // bearer key for the receipt page
      order_number: session.id.slice(-8).toUpperCase(),
      email: session.customer_details?.email ?? null,
      name: session.customer_details?.name ?? null,
      total_cents: session.amount_total,
      currency: session.currency,
      status: 'paid',
      price_id: priceId,
      product_id: product?.id ?? null,
      test_mode: event.livemode === false,
      raw: event,
    },
  });
  const order = inserted?.[0];

  if (!product) {
    // Paid, but nothing to deliver. Recorded so it can be fixed by hand.
    return json({ ok: true, warning: 'no product matched', priceId });
  }

  const files = await db(
    `shop_product_files?product_id=eq.${product.id}&select=id,label,size_label`
  );
  const expiresAt = new Date(Date.now() + GRANT_DAYS * 86400_000).toISOString();
  const grants = (files || []).map((f) => ({
    token: randomToken(),
    order_id: order.id,
    file_id: f.id,
    expires_at: expiresAt,
    max_uses: GRANT_MAX_USES,
  }));

  if (grants.length) {
    await db('shop_grants', { method: 'POST', body: grants });
    const origin = new URL(request.url).origin;
    await sendDownloadEmail({
      to: session.customer_details?.email,
      name: session.customer_details?.name,
      productTitle: product.title,
      orderNumber: order.order_number,
      links: grants.map((g, i) => ({
        label: files[i].label,
        size_label: files[i].size_label,
        url: `${origin}/api/download?token=${g.token}`,
      })),
    });
  }

  return json({ ok: true, granted: grants.length });
}
