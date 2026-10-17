import {
  getClientIp,
  isRateLimited,
  passwordsMatch,
  setSessionCookie,
  signSession,
  SESSION_DAYS,
} from '../server-lib/adminAuth.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(`admin-login:${ip}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return res.status(429).json({
      error: 'Too many attempts. Try again in 15 minutes.',
      retryAfterSec: Math.ceil(WINDOW_MS / 1000),
    });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin login is not configured on the server.' });
  }

  const { password } = req.body || {};
  if (!passwordsMatch(password, adminPassword)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  setSessionCookie(res, exp, signSession(exp));
  return res.status(200).json({ ok: true });
}
