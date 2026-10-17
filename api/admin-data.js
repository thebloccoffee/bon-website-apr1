/**
 * Admin CRUD proxy. The browser never touches Supabase with the anon key
 * for writes anymore: every mutation goes through here, which verifies the
 * admin session cookie and then uses the service_role key (bypasses RLS).
 *
 * POST /api/admin-data
 *   { table: 'blog_posts' | 'portfolio_projects' | 'destinations',
 *     op: 'list' | 'create' | 'update' | 'delete',
 *     id?: string, payload?: object,
 *     order?: { column: string, ascending: boolean } }
 */
import { requireAdmin, getServiceClient } from '../server-lib/adminAuth.js';

const TABLES = new Set(['blog_posts', 'portfolio_projects', 'destinations']);
const DEFAULT_ORDER = {
  blog_posts: { column: 'created_at', ascending: false },
  portfolio_projects: { column: 'order', ascending: true },
  destinations: { column: 'order', ascending: true },
};
// Never allow the client to overwrite these columns.
const PROTECTED_KEYS = new Set(['id', 'created_at']);

function sanitize(payload) {
  const clean = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (!PROTECTED_KEYS.has(k)) clean[k] = v;
  }
  return clean;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const { table, op, id, payload, order } = req.body || {};
  if (!TABLES.has(table)) {
    return res.status(400).json({ error: 'Unknown table' });
  }

  let client;
  try {
    client = getServiceClient();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  try {
    if (op === 'list') {
      const o = order || DEFAULT_ORDER[table];
      const { data, error } = await client
        .from(table)
        .select('*')
        .order(o.column, { ascending: o.ascending !== false });
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (op === 'create') {
      const { data, error } = await client
        .from(table)
        .insert(sanitize(payload))
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (op === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data, error } = await client
        .from(table)
        .update(sanitize(payload))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (op === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown op' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
