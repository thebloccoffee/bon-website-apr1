// Success page lookup. The LS order `identifier` is a v4 UUID and acts as the
// bearer for the receipt — the same model Lemon Squeezy uses for its own
// receipt URLs. Download tokens are separate and independently revocable.

import { db, json } from './_shop-lib.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const identifier = new URL(request.url).searchParams.get('identifier');
  if (!identifier || identifier.length < 20) return json({ error: 'Bad request' }, 400);

  const rows = await db(
    `shop_orders?identifier=eq.${encodeURIComponent(identifier)}` +
      `&select=id,order_number,name,status,shop_products(title,slug,cover_image)`
  );
  const order = rows?.[0];
  // The webhook may not have landed yet — the client polls on 404.
  if (!order) return json({ pending: true }, 404);
  if (order.status === 'refunded') return json({ error: 'Order refunded' }, 410);

  const grants = await db(
    `shop_grants?order_id=eq.${order.id}` +
      `&select=token,expires_at,max_uses,used_count,shop_product_files(label,size_label)`
  );

  return json({
    order_number: order.order_number,
    name: order.name,
    product: order.shop_products,
    files: (grants || []).map((g) => ({
      label: g.shop_product_files?.label ?? 'Download',
      size_label: g.shop_product_files?.size_label ?? null,
      url: `/api/download?token=${g.token}`,
      remaining: Math.max(0, (g.max_uses ?? 0) - (g.used_count ?? 0)),
    })),
  });
}
