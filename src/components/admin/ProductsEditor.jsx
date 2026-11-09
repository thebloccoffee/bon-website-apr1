import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Upload, Loader2, FileDown } from 'lucide-react';
import { adminList, adminCreate, adminUpdate, adminDelete } from '@/api/adminApi';
import { listFiles, uploadFile, deleteFile, listOrders } from '@/components/shop/shopAdmin';
import { CATEGORY_OPTIONS } from '@/components/shop/shopMeta';
import { BRANDS, BRAND_KEYS, formatPrice } from '@/lib/brands';
import ImageUploader from './ImageUploader';
import AdminField from './AdminField';

// Only these columns are ever sent. `search` is a generated column and
// id/created_at belong to the database, so saving a whole row would fail.
const EDITABLE = [
  'title', 'slug', 'subtitle', 'description', 'category', 'brand', 'price_formatted',
  'cover_image', 'gallery', 'before_image', 'after_image', 'features', 'faq',
  'stripe_price_id', 'checkout_url', 'status', 'featured', 'order',
];

const EMPTY = {
  title: '', slug: '', subtitle: '', description: '', category: 'lut', brand: 'jooonbon',
  price_formatted: '', cover_image: '', gallery: [], before_image: '', after_image: '',
  features: [], faq: [], stripe_price_id: '', checkout_url: '', status: 'draft',
  featured: false, order: 0,
};

const MAX_UPLOAD_MB = 50;

function slugify(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

export function toPayload(data) {
  const payload = {};
  for (const k of EDITABLE) {
    const v = data[k];
    payload[k] = v === '' || v === undefined ? null : v;
  }
  payload.title = (data.title || '').trim();
  payload.slug = slugify(data.slug || data.title || '');
  payload.order = Number(data.order) || 0;
  payload.featured = !!data.featured;
  payload.brand = BRANDS[data.brand] ? data.brand : 'jooonbon';
  payload.status = data.status === 'published' ? 'published' : 'draft';
  payload.gallery = Array.isArray(data.gallery) ? data.gallery : [];
  payload.features = Array.isArray(data.features) ? data.features : [];
  payload.faq = (Array.isArray(data.faq) ? data.faq : [])
    .map((f) => ({ q: (f.q || '').trim(), a: (f.a || '').trim() }))
    .filter((f) => f.q && f.a);
  return payload;
}

const inputClass =
  'w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm';
const selectClass =
  'w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm';
const btnClass =
  'font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-40';

// Deliverables for one product, kept in the PRIVATE shop-files bucket.
function ProductFiles({ productId }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const key = ['admin-shop-files', productId];

  const { data: files = [], isLoading } = useQuery({ queryKey: key, queryFn: () => listFiles(productId) });

  const remove = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => setError(e.message),
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_UPLOAD_MB * 1048576) {
      setError(`That file is over ${MAX_UPLOAD_MB} MB, the per-file limit on the Supabase free plan. Split or compress it.`);
      return;
    }
    setUploading(true);
    try {
      await uploadFile(productId, file, label);
      setLabel('');
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isLoading && files.length === 0 && (
        <p className="font-serif text-sm text-muted-foreground">
          No files attached. A buyer would pay and get nothing, so add at least one before publishing.
        </p>
      )}
      {files.map((f) => (
        <div key={f.id} className="flex items-center justify-between gap-4 border border-border px-4 py-3">
          <span className="flex items-center gap-3 font-sans text-sm min-w-0">
            <FileDown size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{f.label}</span>
          </span>
          <span className="flex items-center gap-4 shrink-0">
            <span className="font-sans text-xs text-muted-foreground">{f.size_label}</span>
            <button
              type="button"
              aria-label={`Remove ${f.label}`}
              onClick={() =>
                confirm(`Remove ${f.label}? Anyone who already bought it loses this download link.`) && remove.mutate(f.id)
              }
            >
              <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
            </button>
          </span>
        </div>
      ))}

      <div className="flex flex-col md:flex-row gap-3 md:items-end pt-2">
        <div className="flex-1">
          <AdminField label="File label (what the buyer sees)">
            <input className={inputClass} placeholder="e.g. Travel LUTs (.zip)" value={label} onChange={(e) => setLabel(e.target.value)} />
          </AdminField>
        </div>
        <label className={`${btnClass} cursor-pointer flex items-center gap-2 shrink-0`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading' : 'Upload file'}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <p className="font-sans text-xs text-muted-foreground">
        Allowed: .zip .pdf .cube .xmp .dng .lrtemplate .xlsx .csv .numbers .mp4 .mov .drx .png .jpg. Max {MAX_UPLOAD_MB} MB each.
      </p>
      {error && <p className="font-sans text-sm text-destructive">{error}</p>}
    </div>
  );
}

function OrdersList() {
  const { data: orders = [], isLoading, error } = useQuery({ queryKey: ['admin-shop-orders'], queryFn: listOrders });
  if (isLoading) return <p className="font-serif text-muted-foreground">Loading…</p>;
  if (error) return <p className="font-sans text-sm text-destructive">{error.message}</p>;
  if (!orders.length) return <p className="font-serif text-muted-foreground">No orders yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-sans text-sm">
        <thead>
          <tr className="text-left text-xs tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
            <th className="py-2 pr-4 font-normal">Date</th>
            <th className="py-2 pr-4 font-normal">Order</th>
            <th className="py-2 pr-4 font-normal">Product</th>
            <th className="py-2 pr-4 font-normal">Buyer</th>
            <th className="py-2 pr-4 font-normal">Total</th>
            <th className="py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="py-3 pr-4 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('en-CA')}</td>
              <td className="py-3 pr-4 whitespace-nowrap">{o.order_number}</td>
              <td className="py-3 pr-4">{o.shop_products?.title ?? '—'}</td>
              <td className="py-3 pr-4">
                {o.name}
                <span className="block text-xs text-muted-foreground">{o.email}</span>
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {o.total_cents != null ? formatPrice(o.total_cents, (o.currency || 'cad').toUpperCase()) : '—'}
              </td>
              <td className="py-3 whitespace-nowrap">
                {o.status}
                {o.test_mode ? <span className="text-xs text-muted-foreground"> · test</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v) onChange([...(items || []), v]);
    setInput('');
  };
  return (
    <AdminField label={label}>
      <div className="flex flex-wrap gap-2 mb-3">
        {(items || []).map((f, i) => (
          <span key={i} className="font-sans text-xs border border-border px-3 py-1 flex items-center gap-2">
            {f}
            <button type="button" aria-label={`Remove ${f}`} onClick={() => onChange(items.filter((_, x) => x !== i))}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-3">
        <input
          className="bg-transparent border-b border-border focus:border-foreground outline-none py-1 font-sans text-sm flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="font-sans text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Add
        </button>
      </div>
    </AdminField>
  );
}

function FaqEditor({ items, onChange }) {
  const list = Array.isArray(items) ? items : [];
  const update = (i, field, val) => onChange(list.map((f, x) => (x === i ? { ...f, [field]: val } : f)));
  return (
    <AdminField label="FAQ">
      <div className="space-y-6">
        {list.map((f, i) => (
          <div key={i} className="border border-border p-4 space-y-3">
            <div className="flex gap-3">
              <input className={inputClass} placeholder="Question" value={f.q || ''} onChange={(e) => update(i, 'q', e.target.value)} />
              <button type="button" aria-label="Remove question" onClick={() => onChange(list.filter((_, x) => x !== i))}>
                <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            <textarea
              rows={3}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-base resize-y"
              placeholder="Answer"
              value={f.a || ''}
              onChange={(e) => update(i, 'a', e.target.value)}
            />
          </div>
        ))}
        <button type="button" onClick={() => onChange([...list, { q: '', a: '' }])} className="font-sans text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2">
          <Plus size={12} /> Add question
        </button>
      </div>
    </AdminField>
  );
}

export default function ProductsEditor() {
  const qc = useQueryClient();
  const [view, setView] = useState('products');
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-shop-products'],
    queryFn: () => adminList('shop_products', { column: 'order', ascending: true }),
  });

  const save = useMutation({
    mutationFn: async (data) => {
      const payload = toPayload(data);
      if (!payload.title) throw new Error('Title is required');
      if (!payload.slug) throw new Error('Slug is required');
      if (payload.checkout_url && !/^https:\/\//i.test(payload.checkout_url)) {
        throw new Error('Payment Link URL must start with https://');
      }
      return isNew ? adminCreate('shop_products', payload) : adminUpdate('shop_products', data.id, payload);
    },
    onSuccess: (saved) => {
      setSaveError('');
      qc.invalidateQueries({ queryKey: ['admin-shop-products'] });
      qc.invalidateQueries({ queryKey: ['shop-products'] });
      qc.invalidateQueries({ queryKey: ['shop-product'] });
      // Stay open after the first save so files can be attached straight away.
      if (isNew && saved) {
        setEditing(saved);
        setIsNew(false);
      } else {
        setEditing(null);
      }
    },
    onError: (e) => setSaveError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => adminDelete('shop_products', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shop-products'] }),
    // shop_orders references the product, so a product that has sold can't go.
    onError: (e) => alert(`Delete failed: ${e.message}. A product with orders can't be deleted; set it to Draft instead.`),
  });

  const set = (field, val) => setEditing((p) => ({ ...p, [field]: val }));
  const close = () => { setEditing(null); setSaveError(''); };

  if (editing) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-2xl font-light">{isNew ? 'New product' : editing.title}</h2>
          <button type="button" aria-label="Close" onClick={close}><X size={18} /></button>
        </div>

        <AdminField label="Title">
          <input
            className={inputClass}
            value={editing.title || ''}
            onChange={(e) => {
              set('title', e.target.value);
              if (isNew) set('slug', slugify(e.target.value));
            }}
          />
        </AdminField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminField label="URL slug">
            <input className={inputClass} value={editing.slug || ''} onChange={(e) => set('slug', e.target.value)} />
          </AdminField>
          <AdminField label="Brand">
            <select className={selectClass} value={editing.brand || 'jooonbon'} onChange={(e) => set('brand', e.target.value)}>
              {BRAND_KEYS.map((b) => <option key={b} value={b}>{BRANDS[b].name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Category">
            <select className={selectClass} value={editing.category || 'lut'} onChange={(e) => set('category', e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </AdminField>
        </div>

        <AdminField label="Subtitle (one line under the title)">
          <input className={inputClass} value={editing.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
        </AdminField>

        <AdminField label="Description (Markdown: **bold**, lists, links)">
          <textarea
            rows={8}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-base resize-y"
            value={editing.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </AdminField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminField label="Price shown (CAD, display only)">
            <input className={inputClass} placeholder="$29" value={editing.price_formatted || ''} onChange={(e) => set('price_formatted', e.target.value)} />
          </AdminField>
          <AdminField label="Status">
            <select className={selectClass} value={editing.status || 'draft'} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </AdminField>
          <AdminField label="Display order">
            <input type="number" className={inputClass} value={editing.order ?? 0} onChange={(e) => set('order', e.target.value)} />
          </AdminField>
        </div>

        <label className="flex items-center gap-3 font-sans text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={!!editing.featured} onChange={(e) => set('featured', e.target.checked)} />
          Featured (shows on brand pages)
        </label>

        <div className="border border-border p-6 space-y-6">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">
            Stripe. The real price lives there, so change it in both places.
          </p>
          <AdminField label="Payment Link URL">
            <input className={inputClass} placeholder="https://buy.stripe.com/..." value={editing.checkout_url || ''} onChange={(e) => set('checkout_url', e.target.value)} />
          </AdminField>
          <AdminField label="Price ID (what the webhook matches)">
            <input className={inputClass} placeholder="price_1ABC..." value={editing.stripe_price_id || ''} onChange={(e) => set('stripe_price_id', e.target.value)} />
          </AdminField>
        </div>

        <ImageUploader label="Cover image" value={editing.cover_image} onChange={(v) => set('cover_image', v)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploader label="Before (ungraded)" value={editing.before_image} onChange={(v) => set('before_image', v)} />
          <ImageUploader label="After (graded)" value={editing.after_image} onChange={(v) => set('after_image', v)} />
        </div>
        <p className="font-serif text-sm text-muted-foreground -mt-4">
          Set both and the product page shows a drag-to-compare slider instead of the cover.
        </p>
        <ImageUploader label="Gallery" value={editing.gallery} onChange={(v) => set('gallery', v)} multiple />

        <ListEditor label="What's included" items={editing.features} onChange={(v) => set('features', v)} placeholder="e.g. 12 .cube files, then Enter" />
        <FaqEditor items={editing.faq} onChange={(v) => set('faq', v)} />

        <div className="pt-6 border-t border-border space-y-4">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">Files delivered on purchase</p>
          {isNew ? (
            <p className="font-serif text-sm text-muted-foreground">Save the product first, then attach files here.</p>
          ) : (
            <ProductFiles productId={editing.id} />
          )}
        </div>

        {saveError && <p className="font-sans text-sm text-destructive">{saveError}</p>}
        <div className="flex gap-4 pt-4 border-t border-border">
          <button type="button" onClick={() => save.mutate(editing)} disabled={save.isPending} className={btnClass}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={close} className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6" role="tablist">
          {['products', 'orders'].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`font-sans text-xs tracking-[0.2em] uppercase pb-1 border-b ${view === v ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {v}
            </button>
          ))}
        </div>
        {view === 'products' && (
          <button type="button" onClick={() => { setEditing({ ...EMPTY }); setIsNew(true); }} className={`${btnClass} flex items-center gap-2`}>
            <Plus size={14} /> New product
          </button>
        )}
      </div>

      {view === 'orders' ? (
        <OrdersList />
      ) : isLoading ? (
        <p className="font-serif text-muted-foreground">Loading…</p>
      ) : products.length === 0 ? (
        <p className="font-serif text-muted-foreground">No products yet.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-5 border border-border p-4">
              <div className="w-16 h-16 bg-muted shrink-0 overflow-hidden">
                {p.cover_image && <img src={p.cover_image} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm truncate">{p.title}</p>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  {BRANDS[p.brand]?.name ?? p.brand} · {p.price_formatted || 'no price'} · {p.category}
                  {p.status !== 'published' && ' · draft'}
                  {p.featured && ' · featured'}
                  {!p.checkout_url && ' · no buy link'}
                  {!p.stripe_price_id && ' · no price ID'}
                </p>
              </div>
              <button type="button" aria-label={`Edit ${p.title}`} onClick={() => { setEditing({ ...p }); setIsNew(false); }}>
                <Pencil size={15} className="text-muted-foreground hover:text-foreground" />
              </button>
              <button type="button" aria-label={`Delete ${p.title}`} onClick={() => confirm(`Delete ${p.title}? Its attached file records go too.`) && remove.mutate(p.id)}>
                <Trash2 size={15} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
