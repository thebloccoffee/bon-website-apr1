// In-memory stand-in for Supabase PostgREST + Storage, the Stripe API and
// Resend, installed as globalThis.fetch. Only implements what the shop
// endpoints use: eq filters, select with one level of embedding, insert
// (with on_conflict ignore-duplicates), patch, limit.

const FK = {
  // table.embedName -> [localColumn, foreignTable]
  'shop_grants.shop_product_files': ['file_id', 'shop_product_files'],
  'shop_orders.shop_products': ['product_id', 'shop_products'],
};
const UNIQUE = {
  shop_orders: ['stripe_session_id'],
  shop_grants: ['token'],
  shop_products: ['slug'],
};

let seq = 0;
const uuid = () => {
  seq += 1;
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
};

function splitTop(select) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of select) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

export function createBackend({ supabaseUrl = 'https://fake.supabase.co' } = {}) {
  const tables = { shop_products: [], shop_product_files: [], shop_orders: [], shop_grants: [] };
  const stripe = { lineItems: {}, sessions: {} };
  const emails = [];
  const calls = [];

  const project = (table, row, select) => {
    if (!select || select === '*') return { ...row };
    const out = {};
    for (const part of splitTop(select)) {
      const m = part.match(/^(\w+)\((.*)\)$/);
      if (m) {
        const [local, foreign] = FK[`${table}.${m[1]}`];
        const target = tables[foreign].find((r) => r.id === row[local]);
        out[m[1]] = target ? project(foreign, target, m[2]) : null;
      } else out[part] = row[part];
    }
    return out;
  };

  const matches = (row, filters) =>
    filters.every(([col, val]) => String(row[col]) === val);

  function rest(method, url, body, prefer) {
    const table = url.pathname.replace('/rest/v1/', '');
    const rows = tables[table];
    if (!rows) return [404, { message: `relation ${table} does not exist` }];
    const filters = [];
    let select = '*';
    let limit = Infinity;
    for (const [k, v] of url.searchParams) {
      if (k === 'select') select = v;
      else if (k === 'limit') limit = Number(v);
      else if (k === 'order' || k === 'on_conflict') continue;
      else if (v.startsWith('eq.')) filters.push([k, v.slice(3)]);
    }
    const wantRows = (prefer || '').includes('return=representation');

    if (method === 'GET') {
      return [200, rows.filter((r) => matches(r, filters)).slice(0, limit).map((r) => project(table, r, select))];
    }
    if (method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const ignoreDupes = (prefer || '').includes('resolution=ignore-duplicates');
      const created = [];
      for (const item of list) {
        const dupe = (UNIQUE[table] || []).some((col) => item[col] != null && rows.some((r) => r[col] === item[col]));
        if (dupe) {
          if (ignoreDupes) continue;
          return [409, { message: 'duplicate key value violates unique constraint' }];
        }
        const row = { id: uuid(), created_at: new Date().toISOString(), ...item };
        if (table === 'shop_grants') row.used_count = row.used_count ?? 0;
        rows.push(row);
        created.push(row);
      }
      return [201, wantRows ? created.map((r) => ({ ...r })) : null];
    }
    if (method === 'PATCH') {
      const hit = rows.filter((r) => matches(r, filters));
      hit.forEach((r) => Object.assign(r, body));
      return [200, wantRows ? hit.map((r) => ({ ...r })) : null];
    }
    return [405, { message: 'method' }];
  }

  async function fetchImpl(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || {});
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, url: url.toString() });

    const reply = (status, data) =>
      new Response(data == null ? '' : JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (url.origin === supabaseUrl) {
      if (headers.get('apikey') !== 'service-key') return reply(401, { message: 'bad key' });
      if (url.pathname.startsWith('/rest/v1/')) {
        const [status, data] = rest(method, url, body, headers.get('Prefer'));
        return reply(status, data);
      }
      const sign = url.pathname.match(/^\/storage\/v1\/object\/sign\/shop-files\/(.+)$/);
      if (sign) {
        return reply(200, { signedURL: `/object/sign/shop-files/${sign[1]}?token=signed&exp=${body.expiresIn}` });
      }
    }

    if (url.origin === 'https://api.stripe.com') {
      if (headers.get('Authorization') !== 'Bearer sk_test_fake') return reply(401, { error: 'no key' });
      const li = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)\/line_items$/);
      if (li) return reply(200, { data: stripe.lineItems[li[1]] || [] });
      const s = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/);
      if (s) return stripe.sessions[s[1]] ? reply(200, stripe.sessions[s[1]]) : reply(404, { error: 'No such session' });
    }

    if (url.origin === 'https://api.resend.com') {
      emails.push(body);
      return reply(200, { id: 'email_1' });
    }

    return reply(599, { message: `unmocked ${method} ${url}` });
  }

  return { tables, stripe, emails, calls, fetch: fetchImpl };
}
