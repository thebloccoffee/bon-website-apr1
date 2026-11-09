import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react';
import { adminList, adminCreate, adminUpdate, adminDelete } from '@/api/adminApi';
import { BRANDS, BRAND_KEYS } from '@/lib/brands';
import AdminField from './AdminField';

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Pull the 11-char id out of watch?v=, youtu.be/, /shorts/, /embed/ or a bare id. */
export function parseYouTubeId(input = '') {
  const s = String(input).trim();
  if (ID_RE.test(s)) return s;
  const m =
    s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    s.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const slugify = (s = '') =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

// ISO timestamp <-> value for <input type="datetime-local"> (local time).
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const EMPTY = {
  url: '',
  youtube_id: '',
  title: '',
  slug: '',
  description: '',
  brand: 'jooonbon',
  format: 'long',
  tags: [],
  destination: '',
  featured: false,
  status: 'published',
  published_at: null,
  duration_sec: null,
  order: 0,
};

// Columns the editor may write. Excludes id/created_at and the generated `search` column.
const WRITABLE = ['youtube_id', 'slug', 'title', 'description', 'brand', 'format', 'tags', 'destination', 'featured', 'status', 'published_at', 'duration_sec', 'order'];

const inputCls = 'w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm';
const selectCls = 'w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm';

export default function VideosEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const { data: videos, isLoading, error: listError } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: () => adminList('videos', { column: 'published_at', ascending: false }),
    initialData: [],
  });

  const { data: destinations } = useQuery({
    queryKey: ['admin-destinations-options'],
    queryFn: () => adminList('destinations', { column: 'order', ascending: true }).catch(() => []),
    initialData: [],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-videos'] });
    qc.invalidateQueries({ queryKey: ['videos-all'] });
  };

  const save = useMutation({
    mutationFn: async (data) => {
      const payload = Object.fromEntries(WRITABLE.map((k) => [k, data[k]]));
      payload.destination = payload.destination || null;
      payload.description = payload.description || null;
      payload.duration_sec = payload.duration_sec ? Number(payload.duration_sec) : null;
      payload.order = Number(payload.order) || 0;
      if (isNew) await adminCreate('videos', payload);
      else await adminUpdate('videos', editing.id, payload);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (e) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => adminDelete('videos', id),
    onSuccess: invalidate,
    onError: (e) => alert(e.message),
  });

  const open = (row, fresh) => {
    setEditing(fresh ? { ...EMPTY } : { ...EMPTY, ...row, url: row.youtube_id, tags: row.tags || [] });
    setIsNew(fresh);
    setSlugTouched(!fresh);
    setTagInput('');
    setError('');
  };
  const set = (field, val) => setEditing((p) => ({ ...p, [field]: val }));

  const onUrl = (value) => {
    const id = parseYouTubeId(value);
    setEditing((p) => ({
      ...p,
      url: value,
      youtube_id: id || '',
      format: /\/shorts\//.test(value) ? 'short' : p.format,
    }));
  };

  const onTitle = (value) => {
    setEditing((p) => ({ ...p, title: value, slug: slugTouched ? p.slug : slugify(value) }));
  };

  const addTag = (raw) => {
    const parts = raw.split(',').map((t) => slugify(t)).filter(Boolean);
    if (!parts.length) return;
    setEditing((p) => ({ ...p, tags: Array.from(new Set([...(p.tags || []), ...parts])) }));
    setTagInput('');
  };

  const submit = () => {
    setError('');
    if (!ID_RE.test(editing.youtube_id || '')) return setError('Paste a YouTube link or 11-character video ID.');
    if (!editing.title.trim()) return setError('Title is required.');
    if (!editing.slug) return setError('Slug is required.');
    const pendingTag = tagInput.trim();
    const data = pendingTag
      ? { ...editing, tags: Array.from(new Set([...(editing.tags || []), ...pendingTag.split(',').map(slugify).filter(Boolean)])) }
      : editing;
    save.mutate(data);
  };

  if (editing) {
    const validId = ID_RE.test(editing.youtube_id || '');
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-2xl font-light">{isNew ? 'New Video' : 'Edit Video'}</h2>
          <button onClick={() => setEditing(null)} aria-label="Close editor" className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 items-start">
          <AdminField label="YouTube link or ID">
            <input
              className={inputCls}
              placeholder="https://www.youtube.com/watch?v=… or youtu.be/… or /shorts/…"
              value={editing.url}
              onChange={(e) => onUrl(e.target.value)}
            />
            <p className={`font-sans text-xs ${validId ? 'text-muted-foreground' : 'text-destructive'}`}>
              {editing.url ? (validId ? `ID: ${editing.youtube_id}` : 'No video ID found in that link') : 'Paste any YouTube URL'}
            </p>
          </AdminField>
          {validId && (
            <img
              src={`https://i.ytimg.com/vi/${editing.youtube_id}/hqdefault.jpg`}
              alt=""
              width={480}
              height={360}
              className={`w-full object-cover ${editing.format === 'short' ? 'aspect-[9/16] max-w-[10rem]' : 'aspect-video'}`}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AdminField label="Title">
            <input className={`${inputCls} font-serif text-lg`} value={editing.title} onChange={(e) => onTitle(e.target.value)} />
          </AdminField>
          <AdminField label="Slug">
            <input
              className={inputCls}
              value={editing.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', slugify(e.target.value));
              }}
            />
            {slugTouched && (
              <button
                type="button"
                onClick={() => {
                  setSlugTouched(false);
                  set('slug', slugify(editing.title));
                }}
                className="font-sans text-xs text-muted-foreground hover:text-foreground"
              >
                Reset from title
              </button>
            )}
          </AdminField>
          <AdminField label="Brand">
            <select className={selectCls} value={editing.brand} onChange={(e) => set('brand', e.target.value)}>
              {BRAND_KEYS.map((k) => (
                <option key={k} value={k}>{BRANDS[k].name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Format">
            <select className={selectCls} value={editing.format} onChange={(e) => set('format', e.target.value)}>
              <option value="long">Long (16:9)</option>
              <option value="short">Short (9:16)</option>
            </select>
          </AdminField>
          <AdminField label="Destination">
            <select className={selectCls} value={editing.destination || ''} onChange={(e) => set('destination', e.target.value)}>
              <option value="">None</option>
              {destinations.map((d) => (
                <option key={d.id || d.slug} value={d.slug}>{d.name || d.slug}</option>
              ))}
              {editing.destination && !destinations.some((d) => d.slug === editing.destination) && (
                <option value={editing.destination}>{editing.destination}</option>
              )}
            </select>
          </AdminField>
          <AdminField label="Published at">
            <input
              type="datetime-local"
              className={inputCls}
              value={toLocalInput(editing.published_at)}
              onChange={(e) => set('published_at', fromLocalInput(e.target.value))}
            />
          </AdminField>
          <AdminField label="Status">
            <select className={selectCls} value={editing.status} onChange={(e) => set('status', e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </AdminField>
          <AdminField label="Display order">
            <input type="number" className={inputCls} value={editing.order ?? 0} onChange={(e) => set('order', e.target.value)} />
          </AdminField>
          <AdminField label="Duration (seconds, optional)">
            <input type="number" min="0" className={inputCls} value={editing.duration_sec ?? ''} onChange={(e) => set('duration_sec', e.target.value)} />
          </AdminField>
          <AdminField label="Featured">
            <label className="flex items-center gap-3 py-2 font-sans text-sm cursor-pointer">
              <input type="checkbox" checked={!!editing.featured} onChange={(e) => set('featured', e.target.checked)} />
              Show in featured spots
            </label>
          </AdminField>
        </div>

        <AdminField label="Tags">
          <div className="flex flex-wrap gap-2 mb-2">
            {(editing.tags || []).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 border border-border px-2 py-1 font-sans text-xs">
                {t}
                <button type="button" aria-label={`Remove tag ${t}`} onClick={() => set('tags', editing.tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <input
            className={inputCls}
            placeholder="Type a tag and press Enter (comma separates several)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            onBlur={() => tagInput && addTag(tagInput)}
          />
        </AdminField>

        <AdminField label="Description">
          <textarea
            rows={5}
            className="w-full bg-transparent border border-border focus:border-foreground outline-none p-3 font-sans text-sm"
            value={editing.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </AdminField>

        {error && <p className="font-sans text-sm text-destructive">{error}</p>}

        <div className="flex gap-4 pt-4 border-t border-border">
          <button
            onClick={submit}
            disabled={save.isPending}
            className="font-sans text-xs tracking-[0.3em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-50"
          >
            {save.isPending ? 'Saving...' : 'Save Video'}
          </button>
          <button onClick={() => setEditing(null)} className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-2xl font-light">Videos</h2>
        <button
          onClick={() => open(null, true)}
          className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300"
        >
          <Plus size={14} /> New Video
        </button>
      </div>

      {listError && (
        <p className="font-sans text-sm text-destructive">
          Could not load videos: {listError.message}. The videos table may not exist yet (run the hub migration).
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : videos.length === 0 ? (
        <p className="font-serif text-muted-foreground py-12 text-center">No videos yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-4 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`}
                  alt=""
                  width={80}
                  height={45}
                  loading="lazy"
                  decoding="async"
                  className="w-20 aspect-video object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-sans text-sm font-light truncate flex items-center gap-2">
                    {v.featured && <Star size={12} className="shrink-0" fill="currentColor" aria-label="Featured" />}
                    {v.title}
                  </p>
                  <p className="font-sans text-xs text-muted-foreground truncate">
                    {BRANDS[v.brand]?.name || v.brand} · {v.format === 'short' ? 'Short' : 'Long'}
                    {v.published_at && ` · ${new Date(v.published_at).toLocaleDateString()}`}
                    {v.tags?.length > 0 && ` · ${v.tags.join(', ')}`} ·{' '}
                    <span className={v.status === 'published' ? 'text-foreground' : 'text-accent'}>{v.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => open(v, false)} aria-label={`Edit ${v.title}`} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => { if (confirm('Delete this video?')) remove.mutate(v.id); }}
                  aria-label={`Delete ${v.title}`}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
