import React from 'react';

export default function AdminField({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground block">
        {label}
      </label>
      {children}
    </div>
  );
}