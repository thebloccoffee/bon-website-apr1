/**
 * Newsletter signup. POST /api/subscribe
 *   { email, brand, source, consent, consent_text, website (honeypot), t (form start ms) }
 *
 * CASL: we only store a row when the visitor ticked the box (consent === true)
 * and we store the exact checkbox wording they saw in consent_text.
 * Responses are deliberately generic: an address that's already on the list
 * gets the same { ok: true } as a new one, so the endpoint can't be used to
 * check whether someone is subscribed.
 */
import { getServiceClient } from '../server-lib/adminAuth.js';
import { rateLimit, honeypotTripped, tooFast, isEmail } from '../server-lib/rateLimit.js';

const BRANDS = new Set(['jooonbon', 'bonpoints']);
const MAX_SOURCE = 120;
const MAX_CONSENT_TEXT = 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { brand, source, consent, consent_text, website, t } = body;

  // Bots: pretend it worked, store nothing.
  if (honeypotTripped(website) || tooFast(t, { required: true })) {
    return res.status(200).json({ ok: true });
  }

  const rl = rateLimit(req, { scope: 'subscribe', max: 5, windowMs: 10 * 60 * 1000 });
  if (rl.limited) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (consent !== true) {
    return res.status(400).json({ error: 'Please tick the box to confirm you want the emails.' });
  }
  if (typeof consent_text !== 'string' || !consent_text.trim() || consent_text.length > MAX_CONSENT_TEXT) {
    return res.status(400).json({ error: 'Missing consent wording.' });
  }
  const brandValue = BRANDS.has(brand) ? brand : 'jooonbon';
  const sourceValue = typeof source === 'string' ? source.trim().slice(0, MAX_SOURCE) || null : null;

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    console.error('subscribe: service client', e.message);
    return res.status(500).json({ error: 'Signup is not available right now.' });
  }

  const { error } = await client.from('email_signups').insert({
    email,
    brand: brandValue,
    source: sourceValue,
    consent: true,
    consent_text, // stored exactly as shown on the form
    consent_at: new Date().toISOString(),
  });

  // 23505 = unique violation: already on the list for this brand. Same answer as success.
  // If they had unsubscribed and now tick the box again, that's fresh consent:
  // record the new wording and time and clear unsubscribed_at.
  if (error && error.code === '23505') {
    const { error: upErr } = await client
      .from('email_signups')
      .update({ consent_text, consent_at: new Date().toISOString(), unsubscribed_at: null, source: sourceValue })
      .eq('email', email)
      .eq('brand', brandValue)
      .not('unsubscribed_at', 'is', null);
    if (upErr) console.error('subscribe: resubscribe update failed', upErr.code, upErr.message);
    return res.status(200).json({ ok: true });
  }
  if (error) {
    console.error('subscribe: insert failed', error.code, error.message);
    return res.status(500).json({ error: 'Signup is not available right now.' });
  }

  return res.status(200).json({ ok: true });
}
