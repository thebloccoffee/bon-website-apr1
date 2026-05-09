import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import ImageUploader from './ImageUploader';
import AdminField from './AdminField';
import RichEditor from './RichEditor';
import LocationSelect from './LocationSelect';

const DEFAULT_CATEGORIES = ['documentary', 'travel_film', 'commercial', 'wedding', 'music_video', 'short_film'];
const LS_KEY = 'portfolio_custom_categories';

function loadCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return [...DEFAULT_CATEGORIES, ...stored.filter(c => !DEFAULT_CATEGORIES.includes(c))];
  } catch { return DEFAULT_CATEGORIES; }
}

function saveCustomCategories(all) {
  const custom = all.filter(c => !DEFAULT_CATEGORIES.includes(c));
  localStorage.setItem(LS_KEY, JSON.stringify(custom));
}

const EMPTY = {
  title: '', description: '', thumbnail: '', gallery: [], video_url: '',
  location: '', category: 'documentary', year: '', client: '', order: 0, status: 'published',
};

export default function PortfolioEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [categories, setCategories] = useState(loadCategories);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const addCategory = () => {
    const slug = newCatInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug || categories.includes(slug)) { setAddingCat(false); setNewCatInput(''); return; }
    const updated = [...categories, slug];
    setCategories(updated);
    saveCustomCategories(updated);
    if (editing) set('category', slug);
    setAddingCat(false);
    setNewCatInput('');
  };

  const removeCategory = (cat) => {
    if (DEFAULT_CATEGORIES.includes(cat)) return;
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    saveCustomCategories(updated);
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ['admin-portfolio'],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_projects')
        .select('*')
        .order('order', { ascending: true });
      return data || [];
    },
    initialData: [],
  });

  const save = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        const { error } = await supabase.from('portfolio_projects').insert(data);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('portfolio_projects').update(data).eq('id', editing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-portfolio'] });
      qc.invalidateQueries({ queryKey: ['portfolio-all'] });
      qc.invalidateQueries({ queryKey: ['portfolio-featured'] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('portfolio_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portfolio'] }),
  });

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (p) => { setEditing({ ...p }); setIsNew(false); };
  const set = (field, val) => setEditing((p) => ({ ...p, [field]: val }));

  if (editing) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-2xl font-light">{isNew ? 'New Project' : 'Edit Project'}</h2>
          <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AdminField label="Title">
            <input className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-lg" value={editing.title} onChange={(e) => set('title', e.target.value)} />
          </AdminField>
          <AdminField label="Category">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
                  value={editing.category || ''}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                {!DEFAULT_CATEGORIES.includes(editing.category) && editing.category && (
                  <button
                    type="button"
                    onClick={() => { removeCategory(editing.category); set('category', DEFAULT_CATEGORIES[0]); }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remove this custom category"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {addingCat ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    className="flex-1 bg-transparent border-b border-border focus:border-foreground outline-none py-1 font-sans text-xs"
                    placeholder="New category name"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } if (e.key === 'Escape') { setAddingCat(false); setNewCatInput(''); } }}
                  />
                  <button type="button" onClick={addCategory} className="font-sans text-xs tracking-widest uppercase text-foreground hover:text-muted-foreground transition-colors shrink-0">Add</button>
                  <button type="button" onClick={() => { setAddingCat(false); setNewCatInput(''); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={12} /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCat(true)}
                  className="flex items-center gap-1 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                  <Plus size={11} /> Add category
                </button>
              )}
            </div>
          </AdminField>
          <AdminField label="Location">
            <LocationSelect value={editing.location} onChange={(v) => set('location', v)} />
          </AdminField>
          <AdminField label="Year">
            <input className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.year || ''} onChange={(e) => set('year', e.target.value)} />
          </AdminField>
          <AdminField label="Client">
            <input className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.client || ''} onChange={(e) => set('client', e.target.value)} />
          </AdminField>
          <AdminField label="Display Order">
            <input type="number" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.order ?? 0} onChange={(e) => set('order', Number(e.target.value))} />
          </AdminField>
          <AdminField label="Status">
            <select className="w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.status || 'published'} onChange={(e) => set('status', e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </AdminField>
        </div>

        <AdminField label="Description / Story">
          <RichEditor
            value={editing.description}
            onChange={(v) => set('description', v)}
            placeholder="Describe the project, the story behind it, or anything else worth sharing…"
          />
        </AdminField>

        <AdminField label="Video URL">
          <input className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" placeholder="YouTube, Vimeo, or direct link" value={editing.video_url || ''} onChange={(e) => set('video_url', e.target.value)} />
        </AdminField>

        <ImageUploader label="Thumbnail (21:9)" value={editing.thumbnail} onChange={(v) => set('thumbnail', v)} />
        <ImageUploader label="Gallery Photos" value={editing.gallery} onChange={(v) => set('gallery', v)} multiple />

        <div className="flex gap-4 pt-4 border-t border-border">
          <button
            onClick={() => save.mutate(editing)}
            disabled={save.isPending}
            className="font-sans text-xs tracking-[0.3em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-50"
          >
            {save.isPending ? 'Saving...' : 'Save Project'}
          </button>
          <button onClick={() => setEditing(null)} className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-2xl font-light">Portfolio Projects</h2>
        <button onClick={openNew} className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300">
          <Plus size={14} /> New Project
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <p className="font-serif text-muted-foreground py-12 text-center">No projects yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {projects.map((proj) => (
            <div key={proj.id} className="flex items-center justify-between py-5 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {proj.thumbnail && <img src={proj.thumbnail} alt="" className="w-20 h-10 object-cover flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="font-sans text-sm font-light truncate">{proj.title}</p>
                  <p className="font-sans text-xs text-muted-foreground">{proj.location} {proj.year && `· ${proj.year}`} · <span className="text-accent capitalize">{proj.category?.replace(/_/g, ' ')}</span> · <span className={proj.status === 'published' ? 'text-foreground' : 'text-accent'}>{proj.status || 'published'}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => openEdit(proj)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm('Delete this project?')) remove.mutate(proj.id); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
