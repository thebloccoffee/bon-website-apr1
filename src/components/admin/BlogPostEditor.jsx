import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import ImageUploader from './ImageUploader';
import AdminField from './AdminField';
import RichEditor from './RichEditor';

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', cover_image: '',
  gallery: [], location: '', coordinates: '', date_traveled: '', status: 'published', tags: [],
};

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function BlogPostEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    initialData: [],
  });

  const save = useMutation({
    mutationFn: async (data) => {
      const sanitized = { ...data, date_traveled: data.date_traveled || null };
      if (isNew) {
        const { error } = await supabase.from('blog_posts').insert(sanitized);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').update(sanitized).eq('id', editing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      qc.invalidateQueries({ queryKey: ['blog-posts-all'] });
      qc.invalidateQueries({ queryKey: ['blog-posts-featured'] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-blog-posts'] }),
  });

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (post) => { setEditing({ ...post }); setIsNew(false); };
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
          <h2 className="font-sans text-2xl font-light">{isNew ? 'New Post' : 'Edit Post'}</h2>
          <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AdminField label="Title">
            <input
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-lg"
              value={editing.title}
              onChange={(e) => { set('title', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }}
            />
          </AdminField>
          <AdminField label="Slug">
            <input
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
              value={editing.slug}
              onChange={(e) => set('slug', e.target.value)}
            />
          </AdminField>
          <AdminField label="Location">
            <input className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.location || ''} onChange={(e) => set('location', e.target.value)} />
          </AdminField>
          <AdminField label="Coordinates">
            <input className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.coordinates || ''} onChange={(e) => set('coordinates', e.target.value)} />
          </AdminField>
          <AdminField label="Date Traveled">
            <input type="date" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.date_traveled || ''} onChange={(e) => set('date_traveled', e.target.value)} />
          </AdminField>
          <AdminField label="Status">
            <select className="w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm" value={editing.status} onChange={(e) => set('status', e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </AdminField>
        </div>

        <AdminField label="Excerpt">
          <textarea
            rows={3}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-serif text-base resize-none"
            value={editing.excerpt || ''}
            onChange={(e) => set('excerpt', e.target.value)}
          />
        </AdminField>

        <AdminField label="Content">
          <RichEditor
            value={editing.content}
            onChange={(v) => set('content', v)}
            placeholder="Write your post here. Use the toolbar to format text, and click the image icon to insert photos inline…"
          />
        </AdminField>

        <ImageUploader label="Cover Image" value={editing.cover_image} onChange={(v) => set('cover_image', v)} />
        <ImageUploader label="Gallery Photos" value={editing.gallery} onChange={(v) => set('gallery', v)} multiple />

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
            {save.isPending ? 'Saving...' : 'Save Post'}
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
        <h2 className="font-sans text-2xl font-light">Blog Posts</h2>
        <button onClick={openNew} className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300">
          <Plus size={14} /> New Post
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <p className="font-serif text-muted-foreground py-12 text-center">No posts yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center justify-between py-5 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {post.cover_image && <img src={post.cover_image} alt="" className="w-16 h-10 object-cover flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="font-sans text-sm font-light truncate">{post.title}</p>
                  <p className="font-sans text-xs text-muted-foreground">{post.location} {post.date_traveled && `· ${post.date_traveled}`} · <span className={post.status === 'published' ? 'text-foreground' : 'text-accent'}>{post.status}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => openEdit(post)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm('Delete this post?')) remove.mutate(post.id); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
