import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { COUNTRIES, PLACES, ROUTES, LABELS, MAP_W, MAP_H, project, placeOf } from '@/lib/places';
import './monitor.css';

// One fetch per visit; the file is ~40 KB gzipped and cached by the browser.
let mapPromise;
const loadMap = () => {
  if (!mapPromise) {
    mapPromise = fetch('/world-map.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return mapPromise;
};

const MAP_ASPECT = MAP_W / MAP_H;
export const MAX_K = 10;
export const WORLD = { k: 1, cx: MAP_W / 2, cy: MAP_H / 2 };

/**
 * Keep the view inside the map. `b` is how much the map is stretched to fill a
 * frame taller than the map itself (1 on desktop, ~2.4 on a phone).
 */
export function clampView({ k, cx, cy }, b = 1) {
  const kk = Math.min(MAX_K, Math.max(1, k));
  const hw = MAP_W / (2 * b * kk);
  const hh = MAP_H / (2 * kk);
  return {
    k: kk,
    cx: Math.min(MAP_W - hw, Math.max(hw, cx)),
    cy: Math.min(MAP_H - hh, Math.max(hh, cy)),
  };
}

/** View that fits a box (map units) with breathing room, for a frame stretch `b`. */
export function fitBox({ x, y, width, height }, b = 1, pad = 0.6) {
  const k = Math.min(MAP_W / (b * Math.max(width, 8)), MAP_H / Math.max(height, 8)) * pad;
  return clampView({ k: Math.max(1.5, k), cx: x + width / 2, cy: y + height / 2 }, b);
}

const pct = ([x, y]) => ({ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` });
const isTouchUi = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

/**
 * Flat world map with pins, routes and a focus box.
 *
 * `aspect`: the frame's width/height. Taller than the map (phones) stretches
 * the map to fill the height; you then swipe sideways.
 * `view` = { k, cx, cy } is controlled: zoom and the map point in the middle.
 * With `onViewChange` the map takes pinch, drag, double-tap and ctrl+wheel.
 * `onCountry(slug|null, bbox, name)` fires when a country is tapped;
 * `onPin(slug)` when a pin is tapped on a touch screen (first tap selects,
 * a second tap on the same pin opens its page).
 */
export default function WorldMap({
  focus, onFocus, onPin, onCountry, counts = {}, view = WORLD, onViewChange,
  aspect = MAP_ASPECT, log = false, showLabels = true, interactive = true, className = '', style,
}) {
  const [map, setMap] = useState(null);
  const [dragging, setDragging] = useState(false);
  const box = useRef(null);
  const gesture = useRef({ pointers: new Map(), start: null, moved: false, lastTap: 0 });

  useEffect(() => {
    let live = true;
    loadMap().then((m) => live && setMap(m));
    return () => { live = false; };
  }, []);

  const geoToCountry = useMemo(() => Object.fromEntries(COUNTRIES.map((c) => [c.geo, c])), []);
  const geoClass = useMemo(() => {
    const out = {};
    for (const c of COUNTRIES) out[c.geo] = c.status === 'soon' && !counts[c.slug] ? 'soon' : 'lit';
    return out;
  }, [counts]);

  const pins = useMemo(() => PLACES.map((p) => ({ ...p, xy: project(p.lat, p.lng) })), []);
  const routes = useMemo(
    () => ROUTES.map((r) => r.map((s) => placeOf(s)).filter(Boolean).map((p) => project(p.lat, p.lng).map((n) => n.toFixed(1)).join(',')).join(' ')),
    []
  );

  const b = Math.max(1, MAP_ASPECT / aspect);
  const v = clampView(view, b);
  const fx = v.cx / MAP_W;
  const fy = v.cy / MAP_H;
  // The layer is b× the frame's width. Translate puts (cx, cy) in the middle
  // of the frame; scale zooms around that point.
  const transform = `translate(${(1 / (2 * b) - fx) * 100}%, ${(0.5 - fy) * 100}%) scale(${v.k})`;
  const inv = 1 / v.k;
  const focusPlace = focus ? pins.find((p) => p.slug === focus) : null;
  const gestures = Boolean(onViewChange);
  const canPan = gestures && (v.k > 1 || b > 1);

  // ── gestures ───────────────────────────────────────────────────────────────
  const frameW = () => box.current?.getBoundingClientRect().width || MAP_W;

  const onPointerDown = (e) => {
    if (!gestures) return;
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.moved = false;
    g.start = { view: v, pts: [...g.pointers.values()].map((p) => ({ ...p })) };
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!gestures || !g.pointers.has(e.pointerId) || !g.start) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...g.pointers.values()];
    const s = g.start;
    if (pts.length >= 2 && s.pts.length >= 2) {
      const d0 = Math.hypot(s.pts[0].x - s.pts[1].x, s.pts[0].y - s.pts[1].y) || 1;
      const d1 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const m0 = { x: (s.pts[0].x + s.pts[1].x) / 2, y: (s.pts[0].y + s.pts[1].y) / 2 };
      const m1 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const k = Math.min(MAX_K, Math.max(1, s.view.k * (d1 / d0)));
      const u = MAP_W / (b * frameW() * k);
      g.moved = true;
      setDragging(true);
      onViewChange(clampView({ k, cx: s.view.cx - (m1.x - m0.x) * u, cy: s.view.cy - (m1.y - m0.y) * u }, b));
    } else if (pts.length === 1 && canPan) {
      const dx = pts[0].x - s.pts[0].x;
      const dy = pts[0].y - s.pts[0].y;
      if (!g.moved && Math.hypot(dx, dy) < 8) return;
      // At full-world zoom on a phone, a mostly-vertical swipe scrolls the page.
      if (!g.moved && s.view.k === 1 && Math.abs(dy) > Math.abs(dx)) { g.start = null; return; }
      if (!g.moved) e.currentTarget.setPointerCapture?.(e.pointerId);
      g.moved = true;
      setDragging(true);
      const u = MAP_W / (b * frameW() * s.view.k);
      onViewChange(clampView({ k: s.view.k, cx: s.view.cx - dx * u, cy: s.view.cy - dy * u }, b));
    }
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    if (!gestures) return;
    g.pointers.delete(e.pointerId);
    g.start = g.pointers.size ? { view: v, pts: [...g.pointers.values()].map((p) => ({ ...p })) } : null;
    if (!g.pointers.size) setDragging(false);
    if (g.moved || g.pointers.size || e.type === 'pointercancel') return;
    const now = Date.now();
    if (now - g.lastTap < 300 && box.current) {
      // Double tap: zoom in 2x on that spot.
      const r = box.current.getBoundingClientRect();
      const u = MAP_W / (b * r.width * v.k);
      onViewChange(clampView({ k: v.k * 2, cx: v.cx + (e.clientX - (r.left + r.width / 2)) * u, cy: v.cy + (e.clientY - (r.top + r.height / 2)) * u }, b));
      g.lastTap = 0;
    } else {
      g.lastTap = now;
    }
  };

  // A drag must not end in a click on whatever is under the finger.
  const swallowClickAfterDrag = (e) => {
    if (gesture.current.moved) { e.preventDefault(); e.stopPropagation(); gesture.current.moved = false; }
  };

  // Ctrl/⌘ + wheel, or a trackpad pinch, on desktop.
  useEffect(() => {
    const el = box.current;
    if (!el || !gestures) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      onViewChange((cur) => clampView({ ...cur, k: cur.k * Math.exp(-e.deltaY * 0.01) }, b));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gestures, onViewChange, b]);

  return (
    <div
      ref={box}
      className={`m-map relative w-full overflow-hidden select-none ${className}`}
      style={{ aspectRatio: `${aspect}`, touchAction: !gestures ? undefined : v.k > 1 ? 'none' : 'pan-y', cursor: canPan ? (dragging ? 'grabbing' : 'grab') : undefined, ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={swallowClickAfterDrag}
    >
      <div
        className={`m-zoom absolute left-0 top-0 h-full ${log ? 'm-log' : ''} ${dragging ? 'is-dragging' : ''}`}
        style={{ width: `${b * 100}%`, transformOrigin: `${fx * 100}% ${fy * 100}%`, transform }}
      >
        {map ? (
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 w-full h-full" role="img" aria-label="World map of places Jon has filmed" style={{ '--inv': inv }}>
            {map.countries.map((c) => {
              const ours = geoToCountry[c.n];
              return (
                <path
                  key={c.n}
                  data-geo={c.n}
                  d={c.d}
                  className={`land ${geoClass[c.n] || ''} ${onCountry ? 'tappable' : ''}`}
                  onClick={onCountry ? (e) => onCountry(ours?.slug || null, e.currentTarget.getBBox(), c.n) : undefined}
                />
              );
            })}
            {routes.map((pts, i) => <polyline key={i} points={pts} className="route" />)}
          </svg>
        ) : (
          <div className="absolute inset-0" aria-hidden="true" />
        )}

        {pins.map((p) => {
          const status = p.status || 'filmed';
          const Tag = interactive ? Link : 'span';
          return (
            <Tag
              key={p.slug}
              {...(interactive ? { to: `/travel/${p.slug}` } : {})}
              className={`m-pin is-${status} ${focus === p.slug ? 'is-focus' : ''}`}
              style={{ ...pct(p.xy), transform: `scale(${inv})` }}
              aria-label={`${p.name}${status === 'edit' ? ', in the edit' : status === 'soon' ? ', coming soon' : ''}`}
              onMouseEnter={onFocus ? () => onFocus(p.slug) : undefined}
              onFocus={onFocus ? () => onFocus(p.slug) : undefined}
              onClick={
                interactive && onPin
                  ? (e) => {
                      e.stopPropagation();
                      if (isTouchUi() && focus !== p.slug) { e.preventDefault(); onPin(p.slug); }
                    }
                  : undefined
              }
            />
          );
        })}

        {focusPlace && (
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ ...pct(focusPlace.xy), width: 44, height: 44, margin: '-22px 0 0 -22px', transform: `scale(${inv})` }}>
            <span className="m-br tl" /><span className="m-br tr" /><span className="m-br bl" /><span className="m-br brr" />
          </span>
        )}

        {showLabels && v.k === 1 && b === 1 &&
          COUNTRIES.filter((c) => counts[c.slug] && LABELS[c.slug]).map((c) => (
            <span key={c.slug} className="m-mono absolute pointer-events-none whitespace-nowrap hidden md:block" style={{ ...pct(LABELS[c.slug]), fontSize: 10, letterSpacing: '0.08em', color: 'var(--m-dim)' }}>
              {c.code} {counts[c.slug]}
            </span>
          ))}

        {/* City names once there is room to read them */}
        {showLabels && v.k * b >= 3.5 &&
          pins.filter((p) => v.k * b >= (p.labelK || 0)).map((p) => (
            <span key={`n-${p.slug}`} className="m-mono absolute pointer-events-none whitespace-nowrap" style={{ ...pct(p.xy), transform: `scale(${inv}) translate(14px, -50%)`, transformOrigin: '0 0', fontSize: 11, letterSpacing: '0.08em', color: 'var(--m-text)', textShadow: '0 0 3px var(--m-bg), 0 0 3px var(--m-bg), 0 0 3px var(--m-bg)' }}>
              {p.name.toUpperCase()}
            </span>
          ))}
      </div>
    </div>
  );
}
