// Redeems a download grant for a short-lived signed URL. Files live in a
// private bucket, so the storage path alone is worthless without this endpoint.

import { db, signDownload, json } from './_shop-lib.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || token.length < 32) return json({ error: 'Bad request' }, 400);

  const rows = await db(
    `shop_grants?token=eq.${encodeURIComponent(token)}` +
      `&select=id,expires_at,max_uses,used_count,shop_product_files(storage_path)`
  );
  const grant = rows?.[0];
  if (!grant) return json({ error: 'Invalid download link' }, 404);

  if (new Date(grant.expires_at) < new Date()) {
    return json({ error: 'This download link has expired. Reply to your receipt and I will send a fresh one.' }, 410);
  }
  if ((grant.used_count ?? 0) >= (grant.max_uses ?? 0)) {
    return json({ error: 'Download limit reached. Reply to your receipt and I will reset it.' }, 429);
  }

  const path = grant.shop_product_files?.storage_path;
  if (!path) return json({ error: 'File missing' }, 500);

  const url = await signDownload(path, 300);

  await db(`shop_grants?id=eq.${grant.id}`, {
    method: 'PATCH',
    body: { used_count: (grant.used_count ?? 0) + 1 },
  });

  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'no-store' },
  });
}
