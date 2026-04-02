import React, { useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import { supabase } from '@/api/supabaseClient';

// Custom image handler that uploads the file and inserts the URL
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
      await supabase.storage.from('media').upload(path, file);
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      const file_url = data.publicUrl;
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', file_url);
        quill.setSelection(range.index + 1);
      }
    };
  }, [quillRef]);
}

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'blockquote',
  'list', 'indent', 'link', 'image',
];

export default function RichEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);
  const imageHandler = useImageHandler(quillRef);

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