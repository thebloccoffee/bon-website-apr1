/**
 * Mint a short-lived signed upload URL for the `media` bucket.
 * The browser uploads the file bytes directly to Supabase with PUT,
 * so no multipart parsing is needed in the serverless function.
 *
 * POST /api/admin-upload { filename: string, contentType?: string }
 *   -> { signedUrl, path, publicUrl }
 */
import { requireAdmin, getServiceClient } from '../server-lib/adminAuth.js';

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const { filename } = req.body || {};
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Missing filename' });
  }
  const ext = filename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!ALLOWED_EXT.has(ext)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await client.storage.from('media').createSignedUploadUrl(path);
  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Could not create upload URL' });
  }
  const { data: pub } = client.storage.from('media').getPublicUrl(path);
  return res.status(200).json({
    signedUrl: data.signedUrl,
    path: data.path,
    publicUrl: pub.publicUrl,
  });
}
