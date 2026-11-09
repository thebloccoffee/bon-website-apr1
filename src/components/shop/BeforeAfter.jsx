import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Drag-to-compare ungraded/graded stills for LUTs and presets.
// Pointer events cover mouse, touch and pen; arrow keys move it too.
export default function BeforeAfter({ before, after, alt = '', className = '' }) {
  const [pos, setPos] = useState(50);
  const frame = useRef(null);
  const dragging = useRef(false);

  const moveTo = (clientX) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - step));
    else if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + step));
    else if (e.key === 'Home') setPos(0);
    else if (e.key === 'End') setPos(100);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={frame}
      className={cn('relative select-none overflow-hidden bg-muted cursor-ew-resize touch-pan-y rounded-tk-xs', className)}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <img src={after} alt={alt ? `${alt}, graded` : 'Graded'} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <img
        src={before}
        alt={alt ? `${alt}, ungraded` : 'Ungraded'}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={onKeyDown}
        className="absolute top-0 bottom-0 w-px bg-white/90 focus:outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-white"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-white/90 bg-black/30 backdrop-blur-sm" />
      </div>
      <span className="absolute bottom-3 left-3 font-sans text-tk-xs tracking-[0.2em] uppercase text-white/85 pointer-events-none">
        Before
      </span>
      <span className="absolute bottom-3 right-3 font-sans text-tk-xs tracking-[0.2em] uppercase text-white/85 pointer-events-none">
        After
      </span>
    </div>
  );
}
