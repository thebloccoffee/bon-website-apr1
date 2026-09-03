import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Upload, Loader2, FileDown } from 'lucide-react';
import { adminApi } from '@/api/adminClient';
import ImageUploader from './ImageUploader';
import AdminField from './AdminField';

const EMPTY = {
  title: '', slug: '', subtitle: '', description: '', category: 'lut',
  price_formatted: '', cover_image: '', gallery: [], before_image: '', after_image: '',
  features: [], stripe_price_id: '', checkout_url: '', status: 'published', order: 0,
};

const CATEGORIES = [
  { value: 'lut', label: 'LUT' },
  { value: 'preset', label: 'Preset' },
  { value: 'guide', label: 'Travel Guide' },
  { value: 'bundle', label: 'Bundle' },
];

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const inputClass =
  'w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm';

// The deliverables for one product. Uploads land in the PRIVATE shop-files
// bucket, so nothing here is reachable without a paid download grant.
function ProductFiles({ productId }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ['admin-shop-files', productId],
    queryFn: () => adminApi.list('shop_product_files', `product_id=eq.${productId}`),
    initialData: [],
    enabled: !!productId,
  });

  const remove = useMutation({
    mutationFn: (id) => adminApi.remove('shop_product_files', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shop-files', productId] }),
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { path } = await adminApi.upload(file, 'shop-files');
      await adminApi.insert('shop_product_files', {
        product_id: productId,
        label: label.trim() || file.name,
        storage_path: path,
        size_label: `${(file.size / 1048576).toFixed(1)} MB`,
      });
      setLabel('');
      qc.invalidateQueries({ queryKey: ['admin-shop-files', productId] });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {files.length === 0 && (
        <p className="font-serif text-sm text-muted-foreground">
          No files attached yet. Buyers would pay and receive nothing—add at least one.
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
            <button onClick={() => confirm(`Remove ${f.label}?`) && remove.mutate(f.id)}>
              <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
            </button>
          </span>
        </div>
      ))}

      <div className="flex flex-col md:flex-row gap-3 md:items-end pt-2">
        <div className="flex-1">
          <AdminField label="File label (what the buyer sees)">
            <input
              className={inputClass}
              placeholder="e.g. Travel LUTs v2 (.zip)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </AdminField>
        </div>
        <label className="font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-3 cursor-pointer hover:bg-foreground hover:text-background transition-all duration-300 flex items-center gap-2 shrink-0">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading' : 'Upload file'}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );
}

export default function ShopEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [featureInput, setFeatureInput] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-shop-products'],
    queryFn: () => adminApi.list('shop_products', 'order=order.asc'),
    initialData: [],
  });

  const WRITABLE = [
    'title', 'slug', 'subtitle', 'description', 'category', 'price_formatted',
    'cover_image', 'gallery', 'before_image', 'after_image', 'features',
    'stripe_price_id', 'checkout_url', 'status',
  ];

  const save = useMutation({
    mutationFn: async (data) => {
      const payload = {};
      WRITABLE.forEach((k) => { payload[k] = data[k] ?? null; });
      payload.order = Number(data.order) || 0;
      payload.slug = payload.slug || slugify(payload.title || '');
      if (isNew) {
        const [created] = await adminApi.insert('shop_products', payload);
        return created;
      }
      const [updated] = await adminApi.update('shop_products', data.id, payload);
      return updated;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['admin-shop-products'] });
      qc.invalidateQueries({ queryKey: ['shop-products'] });
      // Stay open after the first save so files can be attached straight away.
      if (isNew && saved) { setEditing(saved); setIsNew(false); }
      else setEditing(null);
    },
    onError: (err) => alert('Save failed: ' + err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => adminApi.remove('shop_products', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shop-products'] }),
  });

  const set = (field, val) => setEditing((p) => ({ ...p, [field]: val }));

  const addFeature = () => {
    const f = featureInput.trim();
    if (f) set('features', [...(editing.features || []), f]);
    setFeatureInput('');
  };

  if (editing) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-2xl font-light">{isNew ? 'New product' : editing.title}</h2>
          <button onClick={() => setEditing(null)}><X size={18} /></button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminField label="URL slug">
            <input className={inputClass} value={editing.slug || ''} onChange={(e) => set('slug', e.target.value)} />
          </AdminField>
          <AdminField label="Category">
            <select
              className="w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              value={editing.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </AdminField>
        </div>

        <AdminField label="Subtitle (one line, shows under the title)">
          <input className={inputClass} value={editing.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
        </AdminField>

        <AdminField label="Description">
          <textarea
            rows={5}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-base resize-none"
            value={editing.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </AdminField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminField label="Price (display only)">
            <input className={inputClass} placeholder="$39" value={editing.price_formatted || ''} onChange={(e) => set('price_formatted', e.target.value)} />
          </AdminField>
          <AdminField label="Status">
            <select
              className="w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              value={editing.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </AdminField>
          <AdminField label="Display order">
            <input type="number" className={inputClass} value={editing.order ?? 0} onChange={(e) => set('order', e.target.value)} />
          </AdminField>
        </div>

        <div className="border border-border p-6 space-y-6">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">
            Stripe — the real price lives there, not here
          </p>
          <AdminField label="Payment Link URL">
            <input className={inputClass} placeholder="https://buy.stripe.com/..." value={editing.checkout_url || ''} onChange={(e) => set('checkout_url', e.target.value)} />
          </AdminField>
          <AdminField label="Price ID">
            <input className={inputClass} placeholder="price_1ABC..." value={editing.stripe_price_id || ''} onChange={(e) => set('stripe_price_id', e.target.value)} />
          </AdminField>
        </div>

        <ImageUploader label="Cover image" value={editing.cover_image} onChange={(v) => set('cover_image', v)} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploader label="Before (ungraded)" value={editing.before_image} onChange={(v) => set('before_image', v)} />
          <ImageUploader label="After (graded)" value={editing.after_image} onChange={(v) => set('after_image', v)} />
        </div>
        <p className="font-serif text-sm text-muted-foreground -mt-4">
          Set both and the product page shows a drag-to-compare slider instead of a still.
        </p>

        <ImageUploader label="Gallery" value={editing.gallery} onChange={(v) => set('gallery', v)} multiple />

        <AdminField label="What's included">
          <div className="flex flex-wrap gap-2 mb-3">
            {(editing.features || []).map((f, i) => (
              <span key={i} className="font-sans text-xs border border-border px-3 py-1 flex items-center gap-2">
                {f}
                <button onClick={() => set('features', editing.features.filter((_, x) => x !== i))}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              className="bg-transparent border-b border-border focus:border-foreground outline-none py-1 font-sans text-sm flex-1"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              placeholder="e.g. 12 .cube files — press Enter"
            />
            <button onClick={addFeature} className="font-sans text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Add</button>
          </div>
        </AdminField>

        <div className="pt-6 border-t border-border space-y-4">
          <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">
            Files delivered on purchase
          </p>
          {isNew ? (
            <p className="font-serif text-sm text-muted-foreground">
              Save the product first, then attach files here.
            </p>
          ) : (
            <ProductFiles productId={editing.id} />
          )}
        </div>

        <div className="flex gap-4 pt-4 border-t border-border">
          <button
            onClick={() => save.mutate(editing)}
            disabled={save.isPending}
            className="font-sans text-xs tracking-[0.3em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-40"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(null)}
            className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => { setEditing({ ...EMPTY }); setIsNew(true); }}
        className="font-sans text-xs tracking-[0.2em] uppercase flex items-center gap-2 border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-all duration-300"
      >
        <Plus size={14} /> New product
      </button>

      {isLoading ? (
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
                  {p.price_formatted} · {p.category}
                  {p.status !== 'published' && ' · draft'}
                  {!p.checkout_url && ' · no buy link'}
                </p>
              </div>
              <button onClick={() => { setEditing({ ...p }); setIsNew(false); }}>
                <Pencil size={15} className="text-muted-foreground hover:text-foreground" />
              </button>
              <button onClick={() => confirm(`Delete ${p.title}?`) && remove.mutate(p.id)}>
                <Trash2 size={15} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
