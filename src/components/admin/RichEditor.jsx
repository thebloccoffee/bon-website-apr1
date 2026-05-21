import React, { useRef, useCallback, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import { supabase } from '@/api/supabaseClient';

// Video embed blot — renders as a responsive iframe wrapper
const BlockEmbed = Quill.import('blots/block/embed');
class VideoBlot extends BlockEmbed {
  static create(url) {
    const node = super.create();
    node.setAttribute('contenteditable', 'false');
    node.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
    return node;
  }
  static value(node) {
    return node.querySelector('iframe')?.getAttribute('src') || '';
  }
}
VideoBlot.blotName = 'video-embed';
VideoBlot.tagName = 'div';
VideoBlot.className = 'ql-video-wrap';
Quill.register(VideoBlot, true);

function getEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (url.includes('youtube.com/embed') || url.includes('player.vimeo.com')) return url;
  return null;
}

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

function useVideoHandler(quillRef) {
  return useCallback(() => {
    const url = prompt('Paste a YouTube or Vimeo URL:');
    if (!url) return;
    const embedUrl = getEmbedUrl(url.trim());
    if (!embedUrl) { alert('Could not recognise that URL. Paste a YouTube or Vimeo link.'); return; }
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'video-embed', embedUrl, 'user');
      quill.setSelection(range.index + 1);
    }
  }, [quillRef]);
}

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

const BTN_STYLE = `
  color:#fff; font-size:11px; font-family:sans-serif; background:transparent;
  border:1px solid rgba(255,255,255,0.3); border-radius:3px; padding:2px 8px;
  cursor:pointer; letter-spacing:0.05em;
`;

function useImageResizer(quillRef) {
  useEffect(() => {
    const removeToolbar = () => {
      document.querySelectorAll('.img-resize-toolbar').forEach(t => t.remove());
      document.querySelectorAll('.ql-editor img').forEach(i => { if (i instanceof HTMLElement) i.style.outline = ''; });
    };

    const showToolbar = (img) => {
      removeToolbar();
      const toolbar = document.createElement('div');
      toolbar.className = 'img-resize-toolbar';
      toolbar.style.cssText = `
        position:fixed; display:flex; gap:4px; background:#111; border-radius:4px;
        padding:4px 8px; z-index:9999;
      `;

      SIZES.forEach(({ label, width }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.type = 'button';
        btn.style.cssText = BTN_STYLE;
        btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.2)';
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

      // Caption button
      const sep = document.createElement('div');
      sep.style.cssText = 'width:1px; background:rgba(255,255,255,0.2); margin:2px 2px;';
      toolbar.appendChild(sep);

      const captionBtn = document.createElement('button');
      captionBtn.textContent = '+ Caption';
      captionBtn.type = 'button';
      captionBtn.style.cssText = BTN_STYLE + 'border-color:rgba(255,255,255,0.5);';
      captionBtn.onmouseenter = () => captionBtn.style.background = 'rgba(255,255,255,0.2)';
      captionBtn.onmouseleave = () => captionBtn.style.background = 'transparent';
      captionBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        const blot = Quill.find(img);
        if (!blot) return;
        const idx = quill.getIndex(blot);
        // Insert a new line after the image with caption formatting
        quill.insertText(idx + 1, 'Caption here', { italic: true, align: 'center', color: '#888888' }, 'user');
        quill.setSelection(idx + 1, 12); // select "Caption here" so user can type over it
        removeToolbar();
      };
      toolbar.appendChild(captionBtn);

      document.body.appendChild(toolbar);
      const rect = img.getBoundingClientRect();
      const tbRect = toolbar.getBoundingClientRect();
      toolbar.style.top = `${rect.top - tbRect.height - 6}px`;
      toolbar.style.left = `${rect.left + rect.width / 2 - tbRect.width / 2}px`;
      img.style.outline = '2px solid #6366f1';
    };

    const handleClick = (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.ql-editor')) {
        showToolbar(e.target);
      } else if (!e.target.closest('.img-resize-toolbar')) {
        removeToolbar();
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      removeToolbar();
    };
  }, [quillRef]);
}

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'blockquote',
  'list', 'indent', 'link', 'image', 'width', 'style', 'video-embed',
  'align', 'color',
];

export default function RichEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);
  const imageHandler = useImageHandler(quillRef);
  const videoHandler = useVideoHandler(quillRef);
  useImageResizer(quillRef);

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        ['blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image', 'video'],
        ['clean'],
      ],
      handlers: { image: imageHandler, video: videoHandler },
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
        .rich-editor-wrap .ql-editor .ql-video-wrap { margin: 1.5rem 0; }
        .rich-editor-wrap .ql-editor .ql-video-wrap iframe { width: 100%; aspect-ratio: 16/9; border: none; display: block; }
        .rich-editor-wrap .ql-editor .ql-align-center { font-size: 0.8rem; font-style: italic; color: #888; margin-top: -1.25rem !important; }
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
