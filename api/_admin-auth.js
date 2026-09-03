// Admin session tokens. The password never reaches the browser bundle — it is
// compared here, server-side, and the browser only ever holds a signed,
// httpOnly session cookie it cannot read from JavaScript.

const COOKIE = 'admin_session';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('Missing ADMIN_SESSION_SECRET');
  return s;
}

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function issueSession() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600_000 });
  const b64 = btoa(payload);
  return `${b64}.${await sign(b64)}`;
}

export async function verifySession(request) {
  const cookies = request.headers.get('cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return false;

  const [b64, sig] = match[1].split('.');
  if (!b64 || !sig) return false;
  if (!constantTimeEqual(await sign(b64), sig)) return false;

  try {
    const { exp } = JSON.parse(atob(b64));
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(token) {
  // httpOnly: JS cannot read it, so an XSS bug cannot exfiltrate the session.
  // SameSite=Strict: no cross-site request can act as the admin.
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
