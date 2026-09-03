import React, { useRef, useState } from 'react';

// Drag-to-compare graded/ungraded stills. The whole selling point of a LUT.
export default function BeforeAfter({ before, after, className = '' }) {
  const [pos, setPos] = useState(50);
  const frame = useRef(null);

  const moveTo = (clientX) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={frame}
      className={`relative select-none overflow-hidden bg-muted cursor-ew-resize ${className}`}
      onMouseMove={(e) => e.buttons === 1 && moveTo(e.clientX)}
      onMouseDown={(e) => moveTo(e.clientX)}
      onTouchMove={(e) => moveTo(e.touches[0].clientX)}
    >
      <img src={after} alt="Graded" className="w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt="Ungraded"
          draggable={false}
          className="h-full object-cover max-w-none"
          style={{ width: frame.current?.offsetWidth ?? '100%' }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-px bg-white/90 pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-white/90 bg-black/20 backdrop-blur-sm" />
      </div>
      <span className="absolute bottom-3 left-3 font-sans text-[10px] tracking-[0.2em] uppercase text-white/80 pointer-events-none">
        Before
      </span>
      <span className="absolute bottom-3 right-3 font-sans text-[10px] tracking-[0.2em] uppercase text-white/80 pointer-events-none">
        After
      </span>
    </div>
  );
}
