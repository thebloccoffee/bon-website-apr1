/**
 * Shared helpers for the server-side admin session.
 *
 * Stateless HMAC-signed session cookie (safe for Vercel serverless):
 *   cookie value = "<expiryMs>.<hmacSha256(expiryMs, secret)>"
 * No server-side session store needed; the signature proves the cookie
 * was minted by someone holding ADMIN_PASSWORD / ADMIN_SESSION_SECRET.
 */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const COOKIE_NAME = 'jb_admin';
export const SESSION_DAYS = 7;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

export function signSession(exp) {
  return crypto.createHmac('sha256', getSecret()).update(String(exp)).digest('hex');
}

export function verifySession(req) {
  const secret = getSecret();
  if (!secret) return false;
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)jb_admin=([^;]+)/);
  if (!match) return false;
  let raw;
  try {
    raw = decodeURIComponent(match[1]);
  } catch {
    return false;
  }
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return false;
  const expStr = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const exp = Number(expStr);
  if (!expStr || !sig || Number.isNaN(exp) || exp < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret).update(expStr).digest('hex');
  let a;
  let b;
  try {
    a = Buffer.from(sig, 'hex');
    b = Buffer.from(expected, 'hex');
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function setSessionCookie(res, exp, sig) {
  const value = encodeURIComponent(`${exp}.${sig}`);
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 3600}`,
  ];
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

/** Sends 401 and returns false when the request has no valid admin session. */
export function requireAdmin(req, res) {
  if (!verifySession(req)) {
    res.status(401).json({ error: 'Not authorized' });
    return false;
  }
  return true;
}

/** Supabase client with the service_role key (bypasses RLS). Server-side only. */
export function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service credentials not configured (need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars)'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Best-effort in-memory rate limiter (per serverless instance).
const hits = new Map();

export function isRateLimited(key, maxHits, windowMs) {
  const now = Date.now();
  const times = (hits.get(key) || []).filter((t) => now - t < windowMs);
  times.push(now);
  hits.set(key, times);
  if (hits.size > 2000) {
    const oldest = [...hits.entries()].sort((a, b) => a[1][0] - b[1][0])[0];
    hits.delete(oldest[0]);
  }
  return times.length > maxHits;
}

/** Timing-safe string comparison for the admin password. */
export function passwordsMatch(input, expected) {
  const a = Buffer.from(String(input || ''), 'utf8');
  const b = Buffer.from(String(expected || ''), 'utf8');
  if (a.length !== b.length) {
    // Still do a constant-time compare against a dummy buffer so the
    // timing doesn't leak the expected length.
    crypto.timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
