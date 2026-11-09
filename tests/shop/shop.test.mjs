// Run: node --test tests/shop/
// Exercises the real handlers in api/ against an in-memory Supabase/Stripe.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createBackend } from './fake-backend.mjs';
import {
  verifyStripeSignature,
  signStripePayload,
  SIGNATURE_TOLERANCE_SECONDS,
} from '../../server-lib/shop.js';
import webhook from '../../api/stripe-webhook.js';
import order from '../../api/order.js';
import download from '../../api/download.js';

const SECRET = 'whsec_test_secret';
const ORIGIN = 'https://www.tabasjonbon.com';
const SESSION = 'cs_test_a1B2c3D4e5F6g7H8i9J0';

let be;

beforeEach(() => {
  be = createBackend();
  globalThis.fetch = be.fetch;
  process.env.SUPABASE_URL = 'https://fake.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.RESEND_API_KEY = 're_fake';
  process.env.SHOP_FROM_EMAIL = 'Shop <shop@example.com>';

  be.tables.shop_products.push({ id: 'prod-1', slug: 'pack-1', title: 'Pack <1>', stripe_price_id: 'price_123' });
  be.tables.shop_product_files.push(
    { id: 'file-1', product_id: 'prod-1', label: 'Pack 1 (.zip)', storage_path: 'prod-1/pack 1.zip', size_label: '40 MB', created_at: '2026-01-01' },
    { id: 'file-2', product_id: 'prod-1', label: 'Read me (.pdf)', storage_path: 'prod-1/readme.pdf', size_label: '1 MB', created_at: '2026-01-02' }
  );
  be.stripe.lineItems[SESSION] = [{ price: { id: 'price_123' } }];
});

function session(extra = {}) {
  return {
    id: SESSION,
    payment_status: 'paid',
    status: 'complete',
    payment_intent: 'pi_123',
    amount_total: 4900,
    currency: 'cad',
    customer_details: { email: 'buyer@example.com', name: 'Maria <b>Santos</b>' },
    metadata: {},
    ...extra,
  };
}

async function postEvent(type, object, { secret = SECRET, timestamp, header } = {}) {
  const raw = JSON.stringify({ id: 'evt_1', type, livemode: false, data: { object } });
  const sig = header ?? (await signStripePayload(raw, secret, timestamp));
  const res = await webhook(
    new Request(`${ORIGIN}/api/stripe-webhook`, {
      method: 'POST',
      headers: { 'stripe-signature': sig, 'content-type': 'application/json' },
      body: raw,
    })
  );
  return { res, body: await res.json() };
}

const getOrder = async (id = SESSION) => {
  const res = await order(new Request(`${ORIGIN}/api/order?session_id=${id}`));
  return { res, body: await res.json() };
};

// --- signature -------------------------------------------------------------

test('signature: valid header passes, tampered body and wrong secret fail', async () => {
  const raw = '{"a":1}';
  const header = await signStripePayload(raw, SECRET);
  assert.equal(await verifyStripeSignature(header, raw, SECRET), true);
  assert.equal(await verifyStripeSignature(header, '{"a":2}', SECRET), false);
  assert.equal(await verifyStripeSignature(header, raw, 'whsec_other'), false);
});

test('signature: stale timestamp, missing parts and garbage are rejected', async () => {
  const raw = '{}';
  const old = Math.floor(Date.now() / 1000) - SIGNATURE_TOLERANCE_SECONDS - 5;
  assert.equal(await verifyStripeSignature(await signStripePayload(raw, SECRET, old), raw, SECRET), false);
  assert.equal(await verifyStripeSignature(null, raw, SECRET), false);
  assert.equal(await verifyStripeSignature('t=123', raw, SECRET), false);
  assert.equal(await verifyStripeSignature('v1=abc', raw, SECRET), false);
  assert.equal(await verifyStripeSignature('nonsense', raw, SECRET), false);
  assert.equal(await verifyStripeSignature(await signStripePayload(raw, SECRET), raw, ''), false);
});

test('signature: any matching v1 among several (secret rotation) passes', async () => {
  const raw = '{"x":true}';
  const t = Math.floor(Date.now() / 1000);
  const good = (await signStripePayload(raw, SECRET, t)).split('v1=')[1];
  assert.equal(await verifyStripeSignature(`t=${t},v1=deadbeef,v1=${good}`, raw, SECRET), true);
});

test('webhook: bad signature returns 401 and never touches the database', async () => {
  const { res } = await postEvent('checkout.session.completed', session(), { secret: 'whsec_wrong' });
  assert.equal(res.status, 401);
  assert.equal(be.calls.length, 0);
});

test('webhook: missing STRIPE_WEBHOOK_SECRET returns 500', async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const { res } = await postEvent('checkout.session.completed', session());
  assert.equal(res.status, 500);
});

// --- paid flow -------------------------------------------------------------

test('paid checkout: order + one grant per file + escaped email, then order and download work', async () => {
  const { res, body } = await postEvent('checkout.session.completed', session());
  assert.equal(res.status, 200);
  assert.equal(body.granted, 2);
  assert.equal(be.tables.shop_orders.length, 1);
  const o = be.tables.shop_orders[0];
  assert.equal(o.status, 'paid');
  assert.equal(o.product_id, 'prod-1');
  assert.equal(o.price_id, 'price_123');
  assert.equal(o.test_mode, true);
  assert.equal(be.tables.shop_grants.length, 2);

  assert.equal(be.emails.length, 1);
  assert.match(be.emails[0].html, /Maria &lt;b&gt;Santos&lt;\/b&gt;/);
  assert.doesNotMatch(be.emails[0].html, /<b>Santos/);
  assert.match(be.emails[0].html, new RegExp(`${ORIGIN}/api/download\\?token=[a-f0-9]{64}`));

  const { body: ob } = await getOrder();
  assert.equal(ob.status, 'paid');
  assert.equal(ob.first_name, 'Maria');
  assert.equal(ob.product.title, 'Pack <1>');
  assert.equal(ob.files.length, 2);
  assert.equal(ob.files[0].remaining, 15);
  assert.equal(ob.email, undefined, 'order endpoint must not leak email');

  const dl = await download(new Request(`${ORIGIN}${ob.files[0].url}`));
  assert.equal(dl.status, 302);
  const loc = dl.headers.get('location');
  assert.ok(loc.startsWith('https://fake.supabase.co/storage/v1/object/sign/shop-files/'));
  assert.ok(loc.includes('exp=300'));
  const used = be.tables.shop_grants.find((g) => ob.files[0].url.endsWith(g.token));
  assert.equal(used.used_count, 1);
});

test('webhook replay is harmless (no duplicate order, grants or email)', async () => {
  await postEvent('checkout.session.completed', session());
  const { body } = await postEvent('checkout.session.completed', session());
  assert.equal(body.deduped, true);
  assert.equal(be.tables.shop_orders.length, 1);
  assert.equal(be.tables.shop_grants.length, 2);
  assert.equal(be.emails.length, 1);
});

test('product falls back to metadata.product_slug when line items do not match', async () => {
  be.stripe.lineItems[SESSION] = [{ price: { id: 'price_unknown' } }];
  const { body } = await postEvent('checkout.session.completed', session({ metadata: { product_slug: 'pack-1' } }));
  assert.equal(body.granted, 2);
});

test('paid but no product matched: order recorded, no grants, page shows paid with no files', async () => {
  be.stripe.lineItems[SESSION] = [{ price: { id: 'price_unknown' } }];
  const { body } = await postEvent('checkout.session.completed', session());
  assert.equal(body.warning, 'no product matched');
  assert.equal(be.tables.shop_orders[0].status, 'paid');
  assert.equal(be.tables.shop_grants.length, 0);
  const { body: ob } = await getOrder();
  assert.equal(ob.status, 'paid');
  assert.deepEqual(ob.files, []);
});

// --- delayed payment (GCash) ----------------------------------------------

test('GCash: completed+unpaid is pending with no grants, async success then grants', async () => {
  await postEvent('checkout.session.completed', session({ payment_status: 'unpaid' }));
  assert.equal(be.tables.shop_orders[0].status, 'pending');
  assert.equal(be.tables.shop_grants.length, 0);
  assert.equal((await getOrder()).body.status, 'pending');

  const { body } = await postEvent('checkout.session.async_payment_succeeded', session());
  assert.equal(body.granted, 2);
  assert.equal(be.tables.shop_orders.length, 1);
  assert.equal(be.tables.shop_orders[0].status, 'paid');
  assert.equal((await getOrder()).body.files.length, 2);
});

test('GCash: async failure marks the order failed', async () => {
  await postEvent('checkout.session.completed', session({ payment_status: 'unpaid' }));
  await postEvent('checkout.session.async_payment_failed', session({ payment_status: 'unpaid' }));
  assert.equal(be.tables.shop_orders[0].status, 'failed');
  assert.equal((await getOrder()).body.status, 'failed');
});

test('async success arriving before completed still fulfils once', async () => {
  await postEvent('checkout.session.async_payment_succeeded', session());
  await postEvent('checkout.session.completed', session());
  assert.equal(be.tables.shop_orders.length, 1);
  assert.equal(be.tables.shop_grants.length, 2);
});

// --- order endpoint without a row -------------------------------------------

test('order: no row yet asks Stripe (paid -> confirming, complete+unpaid -> pending, open -> unpaid)', async () => {
  be.stripe.sessions[SESSION] = { payment_status: 'paid', status: 'complete' };
  assert.equal((await getOrder()).body.status, 'confirming');
  be.stripe.sessions[SESSION] = { payment_status: 'unpaid', status: 'complete' };
  assert.equal((await getOrder()).body.status, 'pending');
  be.stripe.sessions[SESSION] = { payment_status: 'unpaid', status: 'open' };
  assert.equal((await getOrder()).body.status, 'unpaid');
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await getOrder()).body.status, 'confirming');
});

test('order: malformed session ids are rejected', async () => {
  for (const id of ['', 'abc', 'cs_live_', 'cs_live_x%27%20or%201%3D1', 'pi_1234567890abcdef']) {
    const { res } = await getOrder(id);
    assert.equal(res.status, 400, id);
  }
});

// --- refunds ----------------------------------------------------------------

test('full refund revokes links; partial refund keeps them', async () => {
  await postEvent('checkout.session.completed', session());
  const { body: partial } = await postEvent('charge.refunded', { payment_intent: 'pi_123', refunded: false });
  assert.equal(partial.ignored, 'partial refund');
  assert.equal(be.tables.shop_orders[0].status, 'paid');

  await postEvent('charge.refunded', { payment_intent: 'pi_123', refunded: true });
  assert.equal(be.tables.shop_orders[0].status, 'refunded');
  assert.equal((await getOrder()).body.status, 'refunded');
  const token = be.tables.shop_grants[0].token;
  const dl = await download(new Request(`${ORIGIN}/api/download?token=${token}`));
  assert.equal(dl.status, 410);

  // A late replay of the completed event must not re-grant.
  await postEvent('checkout.session.completed', session());
  assert.equal(be.tables.shop_grants.length, 2);
  assert.equal(be.tables.shop_orders[0].status, 'refunded');
});

// --- download edge cases --------------------------------------------------------

test('download: bad token 400, unknown 404, limit 429', async () => {
  assert.equal((await download(new Request(`${ORIGIN}/api/download?token=short`))).status, 400);
  assert.equal((await download(new Request(`${ORIGIN}/api/download?token=${'a'.repeat(64)}`))).status, 404);
  await postEvent('checkout.session.completed', session());
  const g = be.tables.shop_grants[0];
  g.used_count = g.max_uses;
  assert.equal((await download(new Request(`${ORIGIN}/api/download?token=${g.token}`))).status, 429);
});

test('ignored event types return 200', async () => {
  const { res, body } = await postEvent('customer.created', { id: 'cus_1' });
  assert.equal(res.status, 200);
  assert.equal(body.ignored, 'customer.created');
});
