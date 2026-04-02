import React, { useRef, useCallback, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import { supabase } from '@/api/supabaseClient';

// Allow style attribute on images so width persists
const Image = Quill.import('formats/image');
Image.sanitize = (url) => url;
class StyledImage extends Image {
  static create(value) {
    const node = super.create(value);
    return node;
  }
  static formats(node) {
    return {
      src: node.getAttribute('src'),
      style: node.getAttribute('style'),
      width: node.getAttribute('width'),
    };
  }
  format(name, value) {
    if (name === 'style' || name === 'width') {
      if (value) this.domNode.setAttribute(name, value);
      else this.domNode.removeAttribute(name);
    } else {
      super.format(name, value);
    }
  }
}
StyledImage.blotName = 'image';
StyledImage.tagName = 'IMG';
Quill.register(StyledImage, true);

function useImageHandler(quillRef) {
  return useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: true });
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', data.publicUrl);
        quill.setSelection(range.index + 1);
      }
    };
  }, [quillRef]);
}

const SIZES = [
  { label: 'S', width: '25%' },
  { label: 'M', width: '50%' },
  { label: 'L', width: '75%' },
  { label: 'Full', width: '100%' },
];

function useImageResizer(quillRef) {
  useEffect(() => {
    let toolbar = null;

    const showToolbar = (img) => {
      removeToolbar();
      toolbar = document.createElement('div');
      toolbar.className = 'img-resize-toolbar';
      toolbar.style.cssText = `
        position:absolute; display:flex; gap:4px; background:#000; border-radius:4px;
        padding:4px 6px; z-index:1000; transform:translateX(-50%);
      `;

      SIZES.forEach(({ label, width }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
          color:#fff; font-size:11px; font-family:sans-serif; background:transparent;
          border:1px solid rgba(255,255,255,0.3); border-radius:3px; padding:2px 7px;
          cursor:pointer; letter-spacing:0.05em;
        `;
        btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.15)';
        btn.onmouseleave = () => btn.style.background = 'transparent';
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          img.style.width = width;
          img.setAttribute('width', width);
          removeToolbar();
        };
        toolbar.appendChild(btn);
      });

      const rect = img.getBoundingClientRect();
      toolbar.style.position = 'fixed';
      toolbar.style.top = `${rect.top - 40 + window.scrollY}px`;
      toolbar.style.left = `${rect.left + rect.width / 2}px`;
      toolbar.style.transform = 'translateX(-50%)';
      document.body.appendChild(toolbar);
      img.style.outline = '2px solid #6366f1';
    };

    const removeToolbar = () => {
      document.querySelectorAll('.img-resize-toolbar').forEach(t => t.remove());
      toolbar = null;
      document.querySelectorAll('.ql-editor img').forEach(i => i.style.outline = '');
    };

    const attachListeners = () => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      const container = editor.root;

      container.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
          showToolbar(e.target);
        } else {
          removeToolbar();
        }
      });
    };

    const timer = setTimeout(attachListeners, 800);
    return () => {
      clearTimeout(timer);
      removeToolbar();
    };
  }, [quillRef]);
}

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'blockquote',
  'list', 'indent', 'link', 'image', 'width', 'style',
];

export default function RichEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);
  const imageHandler = useImageHandler(quillRef);
  useImageResizer(quillRef);

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        ['blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: { image: imageHandler },
    },
  };

  return (
    <div className="rich-editor-wrap">
      <style>{`
        .rich-editor-wrap .ql-toolbar {
          border: 1px solid hsl(var(--border));
          border-bottom: none;
          background: hsl(var(--muted));
          font-family: var(--font-sans);
        }
        .rich-editor-wrap .ql-container {
          border: 1px solid hsl(var(--border));
          font-family: var(--font-serif);
          font-size: 1.05rem;
          min-height: 340px;
          background: hsl(var(--background));
        }
        .rich-editor-wrap .ql-editor {
          min-height: 340px;
          line-height: 1.75;
          color: hsl(var(--foreground));
        }
        .rich-editor-wrap .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .rich-editor-wrap .ql-editor img {
          max-width: 100%;
          margin: 1.25rem 0;
          display: block;
          cursor: pointer;
          transition: outline 0.15s;
        }
        .rich-editor-wrap .ql-editor h1 { font-family: var(--font-sans); font-size: 2rem; font-weight: 300; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .rich-editor-wrap .ql-editor h2 { font-family: var(--font-sans); font-size: 1.5rem; font-weight: 300; margin-bottom: 0.5rem; }
        .rich-editor-wrap .ql-editor h3 { font-family: var(--font-sans); font-size: 1.2rem; font-weight: 400; margin-bottom: 0.5rem; }
        .rich-editor-wrap .ql-editor blockquote { border-left: 2px solid hsl(var(--accent)); padding-left: 1rem; color: hsl(var(--muted-foreground)); margin: 1rem 0; }
        .rich-editor-wrap .ql-snow .ql-stroke { stroke: hsl(var(--foreground)); }
        .rich-editor-wrap .ql-snow .ql-fill { fill: hsl(var(--foreground)); }
        .rich-editor-wrap .ql-snow .ql-picker { color: hsl(var(--foreground)); }
        .rich-editor-wrap .ql-snow .ql-picker-options { background: hsl(var(--background)); border-color: hsl(var(--border)); }
        .rich-editor-wrap .ql-snow.ql-toolbar button:hover .ql-stroke,
        .rich-editor-wrap .ql-snow .ql-toolbar button:hover .ql-stroke { stroke: hsl(var(--primary)); }
        .rich-editor-wrap .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke: hsl(var(--primary)); }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder || 'Write your content here…'}
      />
    </div>
  );
}
