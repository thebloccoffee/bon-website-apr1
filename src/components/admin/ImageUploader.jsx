import React, { useRef, useState } from 'react';
import { adminApi } from '@/api/adminClient';
import { Upload, X, Loader2 } from 'lucide-react';

export default function ImageUploader({ label, value, onChange, multiple = false }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    setUploading(true);
    const urls = [];
    for (const file of files) {
      try {
        const { url } = await adminApi.upload(file);
        urls.push(url);
      } catch (err) {
        console.error('Upload error:', err.message);
        alert('Upload failed: ' + err.message);
      }
    }
    setUploading(false);
    if (multiple) {
      onChange([...(value || []), ...urls]);
    } else {
      onChange(urls[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (idx) => {
    if (multiple) {
      onChange(value.filter((_, i) => i !== idx));
    } else {
      onChange('');
    }
  };

  if (!multiple) {
    return (
      <div className="space-y-2">
        <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">{label}</p>
        {value ? (
          <div className="relative group aspect-[3/1] overflow-hidden bg-muted">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage()}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current.click()}
            className="border border-dashed border-border hover:border-foreground transition-colors cursor-pointer flex flex-col items-center justify-center py-10 gap-3"
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload size={20} className="text-muted-foreground" />
                <span className="font-sans text-xs text-muted-foreground">Click or drag to upload</span>
              </>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(Array.from(e.target.files))} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {(value || []).map((url, i) => (
          <div key={i} className="relative group aspect-square overflow-hidden bg-muted">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current.click()}
          className="aspect-square border border-dashed border-border hover:border-foreground transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload size={16} className="text-muted-foreground" />
              <span className="font-sans text-[10px] text-muted-foreground text-center">Add photos</span>
            </>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(Array.from(e.target.files))} />
    </div>
  );
}
