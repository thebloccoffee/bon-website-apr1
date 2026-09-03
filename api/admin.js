// Authenticated admin API. Every content write in the site goes through here.
//
// Why this exists: the browser previously held both the admin password and a
// Supabase anon key with full read/write RLS policies. Anyone could read the
// bundle and rewrite the site. Now the browser holds neither — it holds a
// signed httpOnly cookie, and the service-role key lives only in this function.

import { db, json } from './_shop-lib.js';
import { verifySession, issueSession, sessionCookie, clearCookie, constantTimeEqual } from './_admin-auth.js';

export const config = { runtime: 'edge' };

// Nothing outside this map is reachable, whatever the client sends.
const TABLES = {
  blog_posts:         { write: true },
  portfolio_projects: { write: true },
  destinations:       { write: true },
  shop_products:      { write: true },
  shop_product_files: { write: true },
  contact_inquiries:  { write: false },  // read-only: leads, never edited here
  shop_orders:        { write: false },  // read-only: payment records are the webhook's
};

const MAX_FAILS = 8;
const LOCKOUT_MINUTES = 15;

async function checkRateLimit(ip) {
  const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60_000).toISOString();
  const rows = await db(
    `admin_login_attempts?ip=eq.${encodeURIComponent(ip)}&window_start=gte.${cutoff}&select=fails`
  );
  return (rows?.[0]?.fails ?? 0) < MAX_FAILS;
}

async function recordFailure(ip) {
  const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60_000).toISOString();
  const rows = await db(
    `admin_login_attempts?ip=eq.${encodeURIComponent(ip)}&select=fails,window_start`
  );
  const row = rows?.[0];
  if (!row || row.window_start < cutoff) {
    await db('admin_login_attempts', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: { ip, fails: 1, window_start: new Date().toISOString() },
    });
  } else {
    await db(`admin_login_attempts?ip=eq.${encodeURIComponent(ip)}`, {
      method: 'PATCH',
      body: { fails: (row.fails ?? 0) + 1 },
    });
  }
}

async function clearFailures(ip) {
  await db(`admin_login_attempts?ip=eq.${encodeURIComponent(ip)}`, { method: 'DELETE' });
}

export default async function handler(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // --- Public actions -------------------------------------------------

  if (action === 'session') {
    return json({ authed: await verifySession(request) });
  }

  if (action === 'login') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return json({ error: 'Admin not configured' }, 500);

    if (!(await checkRateLimit(ip))) {
      return json({ error: `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.` }, 429);
    }

    const { password } = await request.json().catch(() => ({}));
    if (!constantTimeEqual(String(password ?? ''), adminPassword)) {
      await recordFailure(ip);
      return json({ error: 'Incorrect password.' }, 401);
    }

    await clearFailures(ip);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': sessionCookie(await issueSession()),
      },
    });
  }

  if (action === 'logout') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookie(),
      },
    });
  }

  // --- Everything below requires a valid session ----------------------

  if (!(await verifySession(request))) {
    return json({ error: 'Not authenticated' }, 401);
  }

  if (action === 'upload') {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return json({ error: 'No file' }, 400);
    if (file.size > 25 * 1024 * 1024) return json({ error: 'File too large (max 25MB)' }, 413);

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bucket = form.get('bucket') === 'shop-files' ? 'shop-files' : 'media';

    const res = await fetch(
      `${process.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      }
    );
    if (!res.ok) return json({ error: `Upload failed: ${await res.text()}` }, 500);

    // shop-files is private and served only through signed URLs at download time.
    return json({
      path,
      bucket,
      url:
        bucket === 'media'
          ? `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/media/${path}`
          : null,
    });
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const { table, id, data, filter } = await request.json().catch(() => ({}));
  const tableConfig = TABLES[table];
  if (!tableConfig) return json({ error: 'Unknown table' }, 400);

  try {
    if (action === 'list') {
      const query = filter ? `&${filter}` : '';
      return json(await db(`${table}?select=*${query}`));
    }

    if (!tableConfig.write) return json({ error: 'Table is read-only' }, 403);

    if (action === 'insert') {
      return json(await db(table, { method: 'POST', prefer: 'return=representation', body: data }));
    }
    if (action === 'update') {
      if (!id) return json({ error: 'Missing id' }, 400);
      return json(
        await db(`${table}?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          prefer: 'return=representation',
          body: data,
        })
      );
    }
    if (action === 'delete') {
      if (!id) return json({ error: 'Missing id' }, 400);
      await db(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return json({ ok: true });
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }

  return json({ error: 'Unknown action' }, 400);
}
