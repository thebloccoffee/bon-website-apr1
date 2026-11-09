/**
 * Admin-only shop endpoint: deliverable files (private `shop-files` bucket +
 * shop_product_files rows) and a read-only order list. Product rows
 * themselves go through /api/admin-data (table 'shop_products').
 *
 * POST /api/admin-shop
 *   { op: 'files',       product_id }                       -> { data: File[] }
 *   { op: 'upload_url',  product_id, filename }             -> { signedUrl, path }
 *   { op: 'add_file',    product_id, label, storage_path, size_label? } -> { data: File }
 *   { op: 'delete_file', id }                               -> { ok: true }
 *   { op: 'orders' }                                        -> { data: Order[] } (latest 100, no raw payload)
 *
 * The browser PUTs file bytes straight to Supabase with the signed URL, so
 * large zips never pass through the serverless function.
 */
import { requireAdmin, getServiceClient } from '../server-lib/adminAuth.js';

const BUCKET = 'shop-files';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_EXT = new Set(['zip', 'pdf', 'cube', 'xmp', 'dng', 'lrtemplate', 'xlsx', 'csv', 'numbers', 'mp4', 'mov', 'drx', 'png', 'jpg', 'jpeg']);

function safeName(filename) {
  const base = String(filename).split(/[\\/]/).pop() || 'file';
  return base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'file';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  const body = req.body || {};
  const { op } = body;

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  try {
    if (op === 'files') {
      if (!UUID_RE.test(body.product_id || '')) return res.status(400).json({ error: 'Bad product_id' });
      const { data, error } = await client
        .from('shop_product_files')
        .select('*')
        .eq('product_id', body.product_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (op === 'upload_url') {
      if (!UUID_RE.test(body.product_id || '')) return res.status(400).json({ error: 'Bad product_id' });
      if (!body.filename || typeof body.filename !== 'string') return res.status(400).json({ error: 'Missing filename' });
      const name = safeName(body.filename);
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: `Unsupported file type .${ext || '?'}` });
      const path = `${body.product_id}/${Date.now()}-${name}`;
      const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw error || new Error('Could not create upload URL');
      return res.status(200).json({ signedUrl: data.signedUrl, path: data.path || path });
    }

    if (op === 'add_file') {
      const { product_id, label, storage_path, size_label } = body;
      if (!UUID_RE.test(product_id || '')) return res.status(400).json({ error: 'Bad product_id' });
      if (!label || !storage_path) return res.status(400).json({ error: 'Missing label or storage_path' });
      // Only accept paths inside this product's folder (minted by upload_url).
      if (!String(storage_path).startsWith(`${product_id}/`)) return res.status(400).json({ error: 'Bad storage_path' });
      const { data, error } = await client
        .from('shop_product_files')
        .insert({ product_id, label: String(label).slice(0, 200), storage_path, size_label: size_label || null })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (op === 'delete_file') {
      if (!UUID_RE.test(body.id || '')) return res.status(400).json({ error: 'Bad id' });
      const { data: row, error: readErr } = await client
        .from('shop_product_files')
        .select('id,storage_path')
        .eq('id', body.id)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!row) return res.status(404).json({ error: 'Not found' });
      // Deleting the row cascades to its shop_grants, so past buyers lose
      // that link. The editor warns before calling this.
      const { error } = await client.from('shop_product_files').delete().eq('id', row.id);
      if (error) throw error;
      await client.storage.from(BUCKET).remove([row.storage_path]);
      return res.status(200).json({ ok: true });
    }

    if (op === 'orders') {
      const { data, error } = await client
        .from('shop_orders')
        .select('id,created_at,order_number,email,name,total_cents,currency,status,test_mode,product_id,shop_products(title)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    return res.status(400).json({ error: 'Unknown op' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}
