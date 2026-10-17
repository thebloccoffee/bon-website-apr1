/**
 * Client helpers for the server-side admin API.
 * All admin reads/writes go through /api/* (session-cookie authed,
 * service_role on the server) instead of touching Supabase directly
 * with the anon key.
 */

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error('Not authorized. Please log in again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Request failed');
  }
  return json;
}

export async function adminList(table, order) {
  const json = await postJson('/api/admin-data', { table, op: 'list', order });
  return json.data || [];
}

export async function adminCreate(table, payload) {
  const json = await postJson('/api/admin-data', { table, op: 'create', payload });
  return json.data;
}

export async function adminUpdate(table, id, payload) {
  const json = await postJson('/api/admin-data', { table, op: 'update', id, payload });
  return json.data;
}

export async function adminDelete(table, id) {
  await postJson('/api/admin-data', { table, op: 'delete', id });
}

/**
 * Upload an image to the `media` bucket via a server-minted signed URL.
 * Returns the public URL of the uploaded image.
 */
export async function adminUpload(file) {
  const json = await postJson('/api/admin-upload', {
    filename: file.name,
    contentType: file.type,
  });
  const up = await fetch(json.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!up.ok) {
    throw new Error('Upload failed');
  }
  return json.publicUrl;
}
