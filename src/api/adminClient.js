// All admin reads and writes go through /api/admin, which holds the
// service-role key server-side. The browser authenticates with an httpOnly
// cookie it cannot read — nothing sensitive ships in the bundle.

async function call(action, body, { method = 'POST' } = {}) {
  const res = await fetch(`/api/admin?action=${action}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
  return payload;
}

export const adminApi = {
  session: () => call('session', null, { method: 'GET' }),
  login: (password) => call('login', { password }),
  logout: () => call('logout', {}),

  list: (table, filter) => call('list', { table, filter }),
  insert: (table, data) => call('insert', { table, data }),
  update: (table, id, data) => call('update', { table, id, data }),
  remove: (table, id) => call('delete', { table, id }),

  async upload(file, bucket = 'media') {
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', bucket);
    const res = await fetch('/api/admin?action=upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Upload failed');
    return payload;
  },
};
