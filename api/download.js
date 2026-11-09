// GET /api/download?token=<64 hex>
// Redeems a download grant for a 5-minute signed URL. Files live in the
// private shop-files bucket, so a storage path alone is worthless.

import { db, json, signDownload, GRANT_TOKEN_RE } from '../server-lib/shop.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!GRANT_TOKEN_RE.test(token)) return json({ error: 'Bad request' }, 400);

  try {
    const rows = await db(
      `shop_grants?token=eq.${encodeURIComponent(token)}` +
        `&select=id,expires_at,max_uses,used_count,shop_product_files(storage_path)`
    );
    const grant = rows?.[0];
    if (!grant) return json({ error: 'Invalid download link' }, 404);

    if (new Date(grant.expires_at).getTime() < Date.now()) {
      return json({ error: 'This download link has expired. Reply to your receipt email and I will send a new one.' }, 410);
    }
    const used = grant.used_count ?? 0;
    if (used >= (grant.max_uses ?? 0)) {
      return json({ error: 'Download limit reached. Reply to your receipt email and I will reset it.' }, 429);
    }

    const path = grant.shop_product_files?.storage_path;
    if (!path) return json({ error: 'File missing' }, 500);

    const url = await signDownload(path, 300);

    await db(`shop_grants?id=eq.${encodeURIComponent(grant.id)}`, {
      method: 'PATCH',
      body: { used_count: used + 1 },
    });

    return new Response(null, {
      status: 302,
      headers: { Location: url, 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[download]', e);
    return json({ error: 'Download failed. Try again in a minute.' }, 500);
  }
}
