// Lemon Squeezy webhook. This is the ONLY thing that grants downloads —
// the browser's Checkout.Success event is a UI hint, never proof of payment.
//
// Edge runtime is deliberate: it is the one Vercel runtime where the exact raw
// request bytes are reachable (await request.text()). The Node runtime parses
// the body first, and re-serialising it breaks the HMAC.
//
// Configure in Lemon Squeezy -> Settings -> Webhooks:
//   URL:    https://www.tabasjonbon.com/api/ls-webhook
//   Events: order_created, order_refunded
//   Secret: same value as LEMONSQUEEZY_WEBHOOK_SECRET

import { db, randomToken, json } from './_shop-lib.js';

export const config = { runtime: 'edge' };

const GRANT_DAYS = 30;
const GRANT_MAX_USES = 15;

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

async function sendDownloadEmail({ to, name, productTitle, orderNumber, links }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHOP_FROM_EMAIL;
  // Email is a convenience copy. If it is not configured we still return 200 —
  // the buyer already has their files on the success page.
  if (!apiKey || !from) return;

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
        <p style="font-size:16px;line-height:1.7;color:#444;">Order #${orderNumber} — <strong>${productTitle}</strong></p>
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

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook not configured' }, 500);

  // Verify over the raw bytes BEFORE parsing or touching the database.
  const raw = await request.text();
  const expected = await hmacHex(secret, raw);
  const received = request.headers.get('x-signature') || '';
  if (!timingSafeEqual(expected, received)) {
    return json({ error: 'Invalid signature' }, 401);
  }

  const event = request.headers.get('x-event-name');
  const payload = JSON.parse(raw);

  if (event === 'order_refunded') {
    const lsOrderId = String(payload?.data?.id ?? '');
    const existing = await db(`shop_orders?ls_order_id=eq.${lsOrderId}&select=id`);
    if (existing?.[0]) {
      // Kill the download links rather than deleting the record.
      await db(`shop_grants?order_id=eq.${existing[0].id}`, {
        method: 'PATCH',
        body: { expires_at: new Date(0).toISOString(), max_uses: 0 },
      });
      await db(`shop_orders?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        body: { status: 'refunded' },
      });
    }
    return json({ ok: true });
  }

  if (event !== 'order_created') return json({ ok: true, ignored: event });

  const attrs = payload?.data?.attributes ?? {};
  const lsOrderId = String(payload?.data?.id ?? '');
  const item = attrs.first_order_item ?? {};
  const variantId = String(item.variant_id ?? '');

  // LS retries up to 3 times on non-200. Make replays harmless.
  const dupe = await db(`shop_orders?ls_order_id=eq.${lsOrderId}&select=id`);
  if (dupe?.[0]) return json({ ok: true, deduped: true });

  // Match by variant, falling back to the slug we passed through checkout[custom].
  const slug = payload?.meta?.custom_data?.product_slug;
  let product = (await db(
    `shop_products?ls_variant_id=eq.${encodeURIComponent(variantId)}&select=id,title`
  ))?.[0];
  if (!product && slug) {
    product = (await db(
      `shop_products?slug=eq.${encodeURIComponent(slug)}&select=id,title`
    ))?.[0];
  }

  const inserted = await db('shop_orders', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      ls_order_id: lsOrderId,
      identifier: attrs.identifier,
      order_number: attrs.order_number,
      email: attrs.user_email,
      name: attrs.user_name,
      total_cents: attrs.total,
      currency: attrs.currency,
      status: attrs.status,
      variant_id: variantId,
      product_id: product?.id ?? null,
      test_mode: item.test_mode ?? false,
      raw: payload,
    },
  });
  const order = inserted?.[0];

  if (!product) {
    // Paid, but nothing to deliver. Recorded so it can be fixed by hand.
    return json({ ok: true, warning: 'no product matched', variantId });
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
      to: attrs.user_email,
      name: attrs.user_name,
      productTitle: product.title,
      orderNumber: attrs.order_number,
      links: grants.map((g, i) => ({
        label: files[i].label,
        size_label: files[i].size_label,
        url: `${origin}/api/download?token=${g.token}`,
      })),
    });
  }

  return json({ ok: true, granted: grants.length });
}
