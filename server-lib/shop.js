// Shared helpers for the shop endpoints (api/stripe-webhook, api/order,
// api/download). Edge-runtime safe: Web Crypto + fetch only, no Node APIs and
// no SDKs, so the webhook can read the exact raw request bytes.
//
// Env is read on every call (not at module load) so tests can set it.

const env = (name) => (typeof process !== 'undefined' ? process.env[name] : undefined);

function supabaseEnv() {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  }
  return { url: url.replace(/\/$/, ''), key };
}

// Service-role PostgREST call. Bypasses RLS, so this must never run in the browser.
export async function db(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = supabaseEnv();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export const SHOP_BUCKET = 'shop-files';

// Short-lived signed URL for a file in the private shop-files bucket.
export async function signDownload(storagePath, expiresIn = 300) {
  const { url, key } = supabaseEnv();
  const encoded = String(storagePath).split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${url}/storage/v1/object/sign/${SHOP_BUCKET}/${encoded}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`sign failed ${res.status}: ${await res.text()}`);
  const { signedURL } = await res.json();
  return `${url}/storage/v1${signedURL}`;
}

export async function stripeGet(path) {
  const secret = env('STRIPE_SECRET_KEY');
  if (!secret) throw new Error('STRIPE_SECRET_KEY not set');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) throw new Error(`stripe ${res.status}: ${await res.text()}`);
  return res.json();
}

export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Stripe Checkout session ids look like cs_live_a1B2... or cs_test_a1B2...
export const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/;
// Download grant tokens are randomToken(32): 64 lowercase hex chars.
export const GRANT_TOKEN_RE = /^[a-f0-9]{64}$/;

// ---------------------------------------------------------------------------
// Stripe webhook signature
// ---------------------------------------------------------------------------

export const SIGNATURE_TOLERANCE_SECONDS = 300;

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacHex(secret, message) {
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
// The signed payload is `${timestamp}.${rawBody}`. The timestamp check stops
// someone replaying a captured request later.
export async function verifyStripeSignature(header, rawBody, secret, nowSeconds = Date.now() / 1000) {
  if (!header || !secret) return false;

  let timestamp = null;
  const signatures = [];
  for (const piece of String(header).split(',')) {
    const idx = piece.indexOf('=');
    if (idx <= 0) continue;
    const k = piece.slice(0, idx).trim();
    const v = piece.slice(idx + 1).trim();
    if (k === 'v1') signatures.push(v);
    else if (k === 't') timestamp = Number(v);
  }

  if (!timestamp || !Number.isFinite(timestamp) || !signatures.length) return false;
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((sig) => timingSafeEqual(expected, sig));
}

// Builds a valid Stripe-Signature header. Used by tests and local replays.
export async function signStripePayload(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${await hmacHex(secret, `${timestamp}.${rawBody}`)}`;
}
