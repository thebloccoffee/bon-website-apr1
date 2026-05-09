import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import ImageUploader from './ImageUploader';
import AdminField from './AdminField';
import LocationSelect, { continentFromLocation } from './LocationSelect';

const EMPTY = {
  name: '', slug: '', continent: 'Asia', region: '', tagline: '',
  description: '', cover_image: '', featured: false, status: 'published',
  tags: [], href: '', order: 0,
};

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function DestinationsEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const { data: destinations, isLoading } = useQuery({
    queryKey: ['admin-destinations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('destinations')
        .select('*')
        .order('order', { ascending: true });
      return data || [];
    },
    initialData: [],
  });

  const save = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, order: Number(data.order) || 0 };
      if (isNew) {
        const { error } = await supabase.from('destinations').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('destinations').update(payload).eq('id', editing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-destinations'] });
      qc.invalidateQueries({ queryKey: ['destinations-all'] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-destinations'] }),
  });

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (dest) => { setEditing({ ...dest }); setIsNew(false); };
  const set = (field, val) => setEditing((p) => ({ ...p, [field]: val }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !editing.tags?.includes(t)) set('tags', [...(editing.tags || []), t]);
    setTagInput('');
  };

  if (editing) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-2xl font-light">{isNew ? 'New Destination' : 'Edit Destination'}</h2>
          <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AdminField label="Name">
            <input
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-lg"
              value={editing.name}
              onChange={(e) => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }}
            />
          </AdminField>
          <AdminField label="Slug">
            <input
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              value={editing.slug}
              onChange={(e) => set('slug', e.target.value)}
            />
          </AdminField>
          <AdminField label="Country / Location">
            <LocationSelect
              value={editing.name}
              onChange={(v) => {
                set('name', v);
                const c = continentFromLocation(v);
                if (c) set('continent', c);
              }}
            />
          </AdminField>
          <AdminField label="Continent">
            <select
              className="w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              value={editing.continent || ''}
              onChange={(e) => set('continent', e.target.value)}
            >
              <option value="">— Select continent —</option>
              {['Americas','Asia','Europe','Africa','Oceania'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Subregion label (optional)">
            <input
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              placeholder="e.g. Southeast Asia"
              value={editing.region || ''}
              onChange={(e) => set('region', e.target.value)}
            />
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
          <AdminField label="Display Order">
            <input
              type="number"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              value={editing.order}
              onChange={(e) => set('order', e.target.value)}
            />
          </AdminField>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="featured-toggle"
            type="checkbox"
            checked={editing.featured || false}
            onChange={(e) => set('featured', e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="featured-toggle" className="font-sans text-sm text-muted-foreground cursor-pointer">
            Featured (shows in top picks section)
          </label>
        </div>

        <AdminField label="Tagline (short one-liner)">
          <input
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
            placeholder="e.g. From Hanoi's chaos to Ha Long Bay's stillness."
            value={editing.tagline || ''}
            onChange={(e) => set('tagline', e.target.value)}
          />
        </AdminField>

        <AdminField label="Description (1–2 sentences for the card)">
          <textarea
            rows={3}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-base resize-none"
            value={editing.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </AdminField>

        <AdminField label="Link (optional — external post or page)">
          <input
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
            placeholder="https://..."
            value={editing.href || ''}
            onChange={(e) => set('href', e.target.value)}
          />
        </AdminField>

        <ImageUploader label="Cover Image" value={editing.cover_image} onChange={(v) => set('cover_image', v)} />

        <AdminField label="Tags">
          <div className="flex flex-wrap gap-2 mb-3">
            {(editing.tags || []).map((t) => (
              <span key={t} className="font-sans text-xs tracking-[0.1em] uppercase border border-border px-3 py-1 flex items-center gap-2">
                {t}
                <button onClick={() => set('tags', editing.tags.filter((x) => x !== t))}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              className="bg-transparent border-b border-border focus:border-foreground outline-none py-1 font-sans text-sm flex-1"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag and press Enter"
            />
            <button onClick={addTag} className="font-sans text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Add</button>
          </div>
        </AdminField>

        <div className="flex gap-4 pt-4 border-t border-border">
          <button
            onClick={() => save.mutate(editing)}
            disabled={save.isPending}
            className="font-sans text-xs tracking-[0.3em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-50"
          >
            {save.isPending ? 'Saving...' : 'Save Destination'}
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
        <h2 className="font-sans text-2xl font-light">Destinations</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300"
        >
          <Plus size={14} /> New Destination
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : destinations.length === 0 ? (
        <p className="font-serif text-muted-foreground py-12 text-center">No destinations yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {destinations.map((dest) => (
            <div key={dest.id} className="flex items-center justify-between py-5 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {dest.cover_image && (
                  <img src={dest.cover_image} alt="" className="w-16 h-10 object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-sans text-sm font-light truncate">{dest.name}</p>
                  <p className="font-sans text-xs text-muted-foreground">
                    {dest.continent}
                    {dest.region ? ` · ${dest.region}` : ''}
                    {dest.featured ? ' · ★ Featured' : ''}
                    {' · '}
                    <span className={dest.status === 'published' ? 'text-foreground' : 'text-accent'}>
                      {dest.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => openEdit(dest)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => { if (confirm('Delete this destination?')) remove.mutate(dest.id); }}
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
