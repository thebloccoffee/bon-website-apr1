import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { thumbFor } from './useMapContent';

const EASE = [0.22, 1, 0.36, 1];

/**
 * The "in focus" card. Its frame never unmounts; only the content crossfades
 * when the place changes, so moving between pins feels continuous.
 * `item` = { key, href, label, name, meta, latest, note }.
 */
export default function FocusCard({ item, size = 'lg', className = '', style }) {
  const reduce = useReducedMotion();
  const lg = size === 'lg';
  const thumbW = lg ? 112 : 92;
  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -6, filter: 'blur(4px)' },
        transition: { duration: 0.22, ease: EASE },
      };

  const body = item && (
    <motion.div key={item.key} {...motionProps} className="flex gap-4 items-stretch w-full">
      <span className="relative shrink-0 overflow-hidden" style={{ width: thumbW, aspectRatio: '3 / 4', background: 'var(--m-line)' }}>
        {item.latest && <img src={thumbFor(item.latest)} alt="" width={thumbW} height={(thumbW * 4) / 3} className="absolute inset-0 w-full h-full object-cover" />}
      </span>
      <span className="flex flex-col gap-1.5 min-w-0 flex-1 py-0.5">
        <span className="m-mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: item.muted ? 'var(--m-faint)' : 'var(--m-rec)' }}>{item.label}</span>
        <span className="font-semibold leading-[1.05] tracking-tight" style={{ fontSize: lg ? 28 : 24 }}>{item.name}</span>
        {item.meta && <span className="m-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--m-dim)' }}>{item.meta}</span>}
        {(item.latest?.title || item.note) && (
          <span className="leading-snug line-clamp-2 mt-auto" style={{ fontSize: lg ? 14 : 13, color: 'var(--m-dim)' }}>{item.latest?.title || item.note}</span>
        )}
        {item.href && <span className="m-mono" style={{ fontSize: 11, letterSpacing: '0.12em' }}>OPEN →</span>}
      </span>
    </motion.div>
  );

  const frameStyle = { borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 90%, transparent)', backdropFilter: 'blur(6px)', ...style };
  const inner = (
    <AnimatePresence mode="popLayout" initial={false}>
      {body}
    </AnimatePresence>
  );

  return item?.href ? (
    <Link to={item.href} aria-live="polite" className={`block border p-3 overflow-hidden ${className}`} style={frameStyle}>{inner}</Link>
  ) : (
    <div aria-live="polite" className={`border p-3 overflow-hidden ${className}`} style={frameStyle}>{inner}</div>
  );
}
