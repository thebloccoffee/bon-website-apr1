/**
 * Client helpers for /api/admin-shop (deliverable files + order list).
 * Product rows themselves go through adminApi ('shop_products').
 */

async function call(body) {
  const res = await fetch('/api/admin-shop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authorized. Please log in again.');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export async function listFiles(productId) {
  const json = await call({ op: 'files', product_id: productId });
  return json.data || [];
}

export function sizeLabel(bytes) {
  if (!bytes) return null;
  if (bytes < 1048576) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Signed upload straight to the private bucket, then register the row.
export async function uploadFile(productId, file, label) {
  const { signedUrl, path } = await call({ op: 'upload_url', product_id: productId, filename: file.name });
  const up = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!up.ok) {
    throw new Error(up.status === 413 ? 'File is too large for the storage plan' : 'Upload failed');
  }
  const json = await call({
    op: 'add_file',
    product_id: productId,
    label: (label || '').trim() || file.name,
    storage_path: path,
    size_label: sizeLabel(file.size),
  });
  return json.data;
}

export async function deleteFile(id) {
  await call({ op: 'delete_file', id });
}

export async function listOrders() {
  const json = await call({ op: 'orders' });
  return json.data || [];
}
