// Stripe webhook. This is the ONLY thing that grants downloads. The browser
// landing on /shop/thanks is a UI hint, never proof of payment.
//
// Edge runtime is deliberate: it gives us the exact raw request bytes
// (await request.text()), which the signature is computed over.
//
// Configure in Stripe -> Developers -> Webhooks:
//   URL:    https://www.jooonbon.com/api/stripe-webhook
//   Events: checkout.session.completed,
//           checkout.session.async_payment_succeeded,
//           checkout.session.async_payment_failed,
//           charge.refunded
//   Secret: whsec_... -> STRIPE_WEBHOOK_SECRET
//
// Order status values written here: pending | paid | failed | refunded.

import {
  db,
  json,
  randomToken,
  stripeGet,
  escapeHtml,
  verifyStripeSignature,
} from '../server-lib/shop.js';

export const config = { runtime: 'edge' };

export const GRANT_DAYS = 30;
export const GRANT_MAX_USES = 15;

const enc = encodeURIComponent;

async function findOrder(sessionId) {
  const rows = await db(
    `shop_orders?stripe_session_id=eq.${enc(sessionId)}&select=id,order_number,status,product_id`
  );
  return rows?.[0] ?? null;
}

// Insert, or return the row that a concurrent delivery already wrote.
async function insertOrder(row) {
  const inserted = await db('shop_orders?on_conflict=stripe_session_id', {
    method: 'POST',
    prefer: 'return=representation,resolution=ignore-duplicates',
    body: row,
  });
  return inserted?.[0] ?? (await findOrder(row.stripe_session_id));
}

function orderRow(session, event, extra) {
  return {
    stripe_session_id: session.id,
    payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    identifier: randomToken(16),
    order_number: session.id.slice(-8).toUpperCase(),
    email: session.customer_details?.email ?? null,
    name: session.customer_details?.name ?? null,
    total_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
    test_mode: event.livemode === false,
    raw: event,
    ...extra,
  };
}

// What was bought: line_items are not in the event payload, so ask Stripe
// rather than trusting anything client-supplied. Falls back to a product_slug
// set in the Payment Link metadata.
async function resolveProduct(session) {
  let priceId = null;
  try {
    const items = await stripeGet(`checkout/sessions/${enc(session.id)}/line_items?limit=1`);
    priceId = items?.data?.[0]?.price?.id ?? null;
  } catch {
    // fall through to the slug match
  }
  let product = null;
  if (priceId) {
    product = (await db(`shop_products?stripe_price_id=eq.${enc(priceId)}&select=id,title`))?.[0] ?? null;
  }
  const slug = session.metadata?.product_slug;
  if (!product && slug) {
    product = (await db(`shop_products?slug=eq.${enc(slug)}&select=id,title`))?.[0] ?? null;
  }
  return { product, priceId };
}

async function sendDownloadEmail({ to, name, productTitle, orderNumber, links }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHOP_FROM_EMAIL;
  // The email is a backup copy. Without it the thanks page still has the links.
  if (!apiKey || !from || !to) return;

  const buttons = links
    .map(
      (l) => `<tr><td style="padding:8px 0;">
        <a href="${escapeHtml(l.url)}" style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(l.label)}</a>
        ${l.size_label ? `<span style="color:#999;font-size:12px;margin-left:12px;">${escapeHtml(l.size_label)}</span>` : ''}
      </td></tr>`
    )
    .join('');

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: `Your download: ${productTitle}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#111;">
          <h2 style="font-weight:300;font-size:28px;margin-bottom:8px;">Thank you${name ? `, ${escapeHtml(name)}` : ''}.</h2>
          <p style="font-size:16px;line-height:1.7;color:#444;">Order ${escapeHtml(orderNumber)}: <strong>${escapeHtml(productTitle)}</strong></p>
          <table style="width:100%;margin-top:24px;">${buttons}</table>
          <p style="font-size:13px;color:#999;margin-top:32px;">
            These links work for ${GRANT_DAYS} days and up to ${GRANT_MAX_USES} downloads each.
            Save the files somewhere safe once you have them. If something goes wrong, reply to this email.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
          <p style="font-size:12px;color:#999;">jooonbon.com</p>
        </div>`,
      }),
    });
  } catch {
    // Never fail the webhook over email.
  }
}

// Paid: record the order (or upgrade a pending one) and mint download grants.
// Safe to run more than once for the same session.
async function fulfill(session, event, origin) {
  let order = await findOrder(session.id);
  if (order?.status === 'refunded') return json({ ok: true, ignored: 'already refunded' });

  let product = null;
  let priceId = null;
  if (order?.product_id) {
    product = (await db(`shop_products?id=eq.${enc(order.product_id)}&select=id,title`))?.[0] ?? null;
  }
  if (!product) ({ product, priceId } = await resolveProduct(session));

  if (!order) {
    order = await insertOrder(
      orderRow(session, event, { status: 'paid', price_id: priceId, product_id: product?.id ?? null })
    );
  } else if (order.status !== 'paid' || (!order.product_id && product)) {
    const patched = await db(`shop_orders?id=eq.${enc(order.id)}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status: 'paid',
        product_id: product?.id ?? order.product_id ?? null,
        ...(priceId ? { price_id: priceId } : {}),
        raw: event,
      },
    });
    order = patched?.[0] ?? order;
  }

  // Paid, but nothing to deliver. Recorded so Jon can fix it by hand.
  if (!product) return json({ ok: true, warning: 'no product matched', priceId });

  const existing = await db(`shop_grants?order_id=eq.${enc(order.id)}&select=id&limit=1`);
  if (existing?.length) return json({ ok: true, deduped: true });

  const files = (await db(
    `shop_product_files?product_id=eq.${enc(product.id)}&select=id,label,size_label&order=created_at.asc`
  )) || [];
  const expiresAt = new Date(Date.now() + GRANT_DAYS * 86400_000).toISOString();
  const grants = files.map((f) => ({
    token: randomToken(),
    order_id: order.id,
    file_id: f.id,
    expires_at: expiresAt,
    max_uses: GRANT_MAX_USES,
  }));

  if (grants.length) {
    await db('shop_grants', { method: 'POST', body: grants });
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

// Session completed but the money has not settled (GCash and other delayed
// methods). Record it so the thanks page can say "processing" honestly.
async function recordPending(session, event) {
  const order = await findOrder(session.id);
  if (order) return json({ ok: true, ignored: `order already ${order.status}` });
  await insertOrder(orderRow(session, event, { status: 'pending' }));
  return json({ ok: true, pending: true });
}

async function markFailed(session) {
  await db(`shop_orders?stripe_session_id=eq.${enc(session.id)}&status=eq.pending`, {
    method: 'PATCH',
    body: { status: 'failed' },
  });
  return json({ ok: true, failed: true });
}

async function handleRefund(charge) {
  // Partial refunds keep access. Only a full refund revokes the links.
  if (charge.refunded !== true) return json({ ok: true, ignored: 'partial refund' });
  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!paymentIntent) return json({ ok: true, ignored: 'no payment_intent' });

  const rows = await db(`shop_orders?payment_intent=eq.${enc(paymentIntent)}&select=id`);
  const order = rows?.[0];
  if (!order) return json({ ok: true, ignored: 'unknown order' });

  // Kill the download links rather than deleting the record.
  await db(`shop_grants?order_id=eq.${enc(order.id)}`, {
    method: 'PATCH',
    body: { expires_at: new Date(0).toISOString(), max_uses: 0 },
  });
  await db(`shop_orders?id=eq.${enc(order.id)}`, { method: 'PATCH', body: { status: 'refunded' } });
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

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  const obj = event?.data?.object || {};
  const origin = new URL(request.url).origin;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // 'no_payment_required' = a 100% discount code. Still a real order.
        return obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required'
          ? await fulfill(obj, event, origin)
          : await recordPending(obj, event);
      case 'checkout.session.async_payment_succeeded':
        return await fulfill(obj, event, origin);
      case 'checkout.session.async_payment_failed':
        return await markFailed(obj);
      case 'charge.refunded':
        return await handleRefund(obj);
      default:
        return json({ ok: true, ignored: event.type });
    }
  } catch (e) {
    // Non-2xx makes Stripe retry, and every path above is safe to replay.
    console.error('[stripe-webhook]', e);
    return json({ error: 'Webhook handler failed' }, 500);
  }
}
