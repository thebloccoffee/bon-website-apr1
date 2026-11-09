/**
 * Spam and abuse guards for public Vercel functions (/api/subscribe, /api/contact).
 *
 * LIMITATION: the rate limiter is in-memory, so it only counts hits seen by
 * one warm serverless instance. Vercel can run several instances at once and
 * recycles them, so a determined attacker can get past it. Treat it as a first
 * layer that stops casual floods and naive bots. For a hard limit, back it with
 * a shared store (Upstash Redis / Vercel KV) or Vercel's WAF rate-limit rules.
 */

const buckets = new Map();
const MAX_KEYS = 5000;

/** Client IP as Vercel reports it (first entry of x-forwarded-for). */
export function clientIp(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Sliding-window limiter. Returns { limited, retryAfterSec }.
 * `scope` keeps separate budgets per endpoint for the same IP.
 */
export function rateLimit(req, { scope = 'default', max = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const key = `${scope}:${clientIp(req)}`;
  const now = Date.now();
  const times = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  times.push(now);
  buckets.set(key, times);

  if (buckets.size > MAX_KEYS) {
    // Drop the oldest key so memory stays bounded.
    const firstKey = buckets.keys().next().value;
    buckets.delete(firstKey);
  }

  if (times.length > max) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - times[0])) / 1000));
    return { limited: true, retryAfterSec };
  }
  return { limited: false, retryAfterSec: 0 };
}

/** True when the hidden honeypot field has any content (bots fill every input). */
export function honeypotTripped(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

/**
 * True when the form was submitted faster than a person could fill it.
 * `startedAt` is the ms timestamp the form rendered at (field `t`).
 * Missing or unparseable values pass unless `required` is set, so older
 * clients that don't send `t` keep working.
 */
export function tooFast(startedAt, { minMs = 2500, maxAgeMs = 24 * 60 * 60 * 1000, required = false } = {}) {
  const t = Number(startedAt);
  if (!startedAt || Number.isNaN(t)) return required;
  const elapsed = Date.now() - t;
  if (elapsed < minMs) return true;
  // A timestamp from the future or from days ago is not a real form session.
  if (elapsed > maxAgeMs) return true;
  return false;
}

/** Escape text for safe interpolation into an HTML email body. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Basic email shape check, same rule as the email_signups CHECK constraint. */
export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

/** Strip CR/LF so a value can't inject extra mail headers. */
export function oneLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}
