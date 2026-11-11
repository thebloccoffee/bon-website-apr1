import React, { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoCentroid, geoBounds, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import { COUNTRIES, PLACES, ROUTES, placeOf } from '@/lib/places';
import './monitor.css';

// Country shapes load once per visit as their own chunk (~105 KB raw, ~30 KB gz).
let worldPromise;
const loadWorld = () => {
  if (!worldPromise) {
    worldPromise = import('world-atlas/countries-110m.json')
      .then((m) => feature(m.default || m, (m.default || m).objects.countries).features)
      .catch(() => []);
  }
  return worldPromise;
};

export const MAX_ZOOM = 6;
const isTouchUi = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Which edge each country's tags sit on. The globe spins under fixed tags,
// so their leader lines sweep across the screen as it turns.
const LEFT = new Set(['canada', 'usa', 'china', 'south-korea', 'taiwan', 'japan']);
const shortName = (n) => n.replace(/, BC$/, '').replace(' National Park', '');

/** The triangle wireframe: a 15° grid plus one diagonal per cell. */
function wireframe() {
  const lines = [];
  for (let lng = -180; lng < 180; lng += 15) {
    for (let lat = -75; lat < 90; lat += 15) {
      if (lat + 15 > 90) continue;
      lines.push([[lng, lat], [lng + 15, lat + 15]]);
    }
  }
  return { type: 'MultiLineString', coordinates: lines };
}

/**
 * A see-through spinning globe. City tags stay at the frame's edges and
 * point at their pins with thin leader lines. Drag to spin, pinch or
 * ctrl+wheel to zoom, tap a country to fly there.
 *
 * `flyTo` = { slug } | { world: true }, with an `n` that changes per request.
 * `zoom` is controlled; `onZoom(k)` reports pinch and wheel zooms.
 */
export default function GlobeMap({
  focus, onFocus, onPin, onCountry, counts = {}, flyTo, zoom = 1, onZoom,
  spin = true, compact = false, radius = 0.31, band = [0.13, 0.68], className = '', style,
}) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const svg = useRef(null);
  const tagEls = useRef({});
  const lineEls = useRef({});
  const st = useRef({
    rot: [-110, -18], // centre on Asia first: most of the films are there
    k: 1, kTarget: 1,
    fly: null, drag: null, pointers: new Map(), moved: false,
    hoverGeo: null, focusGeo: null, features: [], colors: null,
    spin: true, idleUntil: 0, size: { w: 0, h: 0 }, dpr: 1, visible: true,
  });

  const places = useMemo(() => {
    const left = PLACES.filter((p) => LEFT.has(p.country));
    const right = PLACES.filter((p) => !LEFT.has(p.country));
    const slots = (list, side) => list.map((p, i) => ({ ...p, side, slot: (i + 0.5) / list.length, phase: (p.lat * 7 + p.lng) % 6.28 }));
    return [...slots(left, 'left'), ...slots(right, 'right')];
  }, []);

  const litGeo = useMemo(() => {
    const out = {};
    for (const c of COUNTRIES) out[c.geo] = { slug: c.slug, soon: c.status === 'soon' && !counts[c.slug] };
    return out;
  }, [counts]);
  const litRef = useRef(litGeo);
  litRef.current = litGeo;

  // Keep props readable from the animation loop without restarting it.
  const props = useRef({});
  props.current = { focus, onFocus, onPin, onCountry, onZoom, spin, compact, radius, band };

  // ── controlled zoom and fly-to ────────────────────────────────────────────
  useEffect(() => { st.current.kTarget = Math.min(MAX_ZOOM, Math.max(1, zoom)); }, [zoom]);

  useEffect(() => {
    if (!flyTo) return;
    const s = st.current;
    if (flyTo.world) {
      s.fly = { to: [s.rot[0], -18], t0: performance.now(), from: [...s.rot] };
      s.idleUntil = 0;
      return;
    }
    const p = placeOf(flyTo.slug);
    let center = p ? [p.lng, p.lat] : null;
    if (!center) {
      const c = COUNTRIES.find((x) => x.slug === flyTo.slug || x.name === flyTo.name);
      const f = s.features.find((x) => x.properties.name === (c?.geo || flyTo.name));
      if (f) center = geoCentroid(f);
    }
    if (!center) return;
    s.fly = { from: [...s.rot], to: [-center[0], -center[1]], t0: performance.now() };
    s.idleUntil = Infinity;
  }, [flyTo]);

  useEffect(() => {
    st.current.focusGeo = focus ? COUNTRIES.find((c) => c.slug === placeOf(focus)?.country)?.geo || null : null;
  }, [focus]);

  // ── main loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = st.current;
    const cvs = canvas.current;
    const ctx = cvs.getContext('2d');
    let raf = 0;
    let alive = true;
    const front = geoOrthographic().clipAngle(90).precision(0.6);
    const back = geoOrthographic().clipAngle(90).precision(0.6).reflectX(true);
    const pf = geoPath(front, ctx);
    const pb = geoPath(back, ctx);
    const grid = geoGraticule10();
    const mesh = wireframe();
    const routes = ROUTES.map((r) => ({ type: 'LineString', coordinates: r.map(placeOf).filter(Boolean).map((p) => [p.lng, p.lat]) }));

    loadWorld().then((f) => { s.features = f; });

    const readColors = () => {
      const cs = getComputedStyle(wrap.current);
      const v = (n) => cs.getPropertyValue(n).trim();
      s.colors = { text: v('--m-text'), dim: v('--m-dim'), faint: v('--m-faint'), line: v('--m-line-2'), rec: v('--m-rec'), bg: v('--m-bg'), lit: v('--m-lit') };
    };
    readColors();
    const themeObs = new MutationObserver(readColors);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const resize = () => {
      const r = wrap.current.getBoundingClientRect();
      s.size = { w: r.width, h: r.height };
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * s.dpr);
      cvs.height = Math.round(r.height * s.dpr);
      cvs.style.width = `${r.width}px`;
      cvs.style.height = `${r.height}px`;
      svg.current.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current);
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; });
    io.observe(wrap.current);

    const reduce = reducedMotion();
    let last = performance.now();

    const frame = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last);
      last = now;
      if (!s.visible || document.hidden) return;
      const { w, h } = s.size;
      if (!w || !h) return;
      const P = props.current;
      const C = s.colors;

      // motion
      if (s.fly) {
        const t = Math.min(1, (now - s.fly.t0) / (reduce ? 1 : 1100));
        const e = 1 - Math.pow(1 - t, 3);
        let d = s.fly.to[0] - s.fly.from[0];
        d = ((d + 540) % 360) - 180; // shortest way round
        s.rot = [s.fly.from[0] + d * e, s.fly.from[1] + (s.fly.to[1] - s.fly.from[1]) * e];
        if (t >= 1) s.fly = null;
      } else if (P.spin && !s.drag && !reduce && now > s.idleUntil) {
        s.rot[0] += dt * 0.006;
      }
      s.k += (s.kTarget - s.k) * Math.min(1, dt / 120);

      // layout: tags take the edges, the globe sits in the middle
      const R = Math.min(h * P.radius, w * (P.compact ? 0.27 : 0.22)) * s.k;
      const cx = w / 2;
      const cy = h / 2;
      for (const pr of [front, back]) pr.scale(R).translate([cx, cy]);
      front.rotate([s.rot[0], s.rot[1], 0]);
      back.rotate([s.rot[0] + 180, -s.rot[1], 0]);
      const center = [-s.rot[0], -s.rot[1]];

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // far side, seen through the glass
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = C.text;
      ctx.beginPath(); pb(grid); pb(mesh); ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.beginPath(); for (const f of s.features) pb(f); ctx.stroke();

      // sphere rim + soft fill so the front reads as solid glass
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = C.bg; ctx.globalAlpha = 0.55; ctx.fill();
      ctx.globalAlpha = 0.35; ctx.strokeStyle = C.text; ctx.lineWidth = 0.8; ctx.stroke();

      // near side wireframe
      ctx.globalAlpha = 0.13; ctx.lineWidth = 0.6;
      ctx.beginPath(); pf(grid); pf(mesh); ctx.stroke();

      // countries: every outline faint; ours strong; hovered/focused filled
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (const f of s.features) if (!litRef.current[f.properties.name]) pf(f);
      ctx.stroke();
      for (const f of s.features) {
        const lit = litRef.current[f.properties.name];
        const name = f.properties.name;
        const hot = name === s.hoverGeo || name === s.focusGeo;
        if (!lit && !hot) continue;
        ctx.beginPath(); pf(f);
        if (hot) { ctx.globalAlpha = 0.16; ctx.fillStyle = C.text; ctx.fill(); }
        ctx.globalAlpha = lit && !lit.soon ? 0.95 : 0.6;
        ctx.lineWidth = hot ? 1.3 : 1;
        ctx.strokeStyle = C.text;
        ctx.stroke();
      }

      // trip routes
      ctx.globalAlpha = 0.9; ctx.strokeStyle = C.rec; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); for (const r of routes) pf(r); ctx.stroke();
      ctx.setLineDash([]);

      // pins, tags and leader lines
      const t = now / 1000;
      const tagH = P.compact ? 22 : 26;
      const top = h * P.band[0];
      const span = h * P.band[1];
      for (const p of places) {
        const near = geoDistance([p.lng, p.lat], center) < Math.PI / 2 - 0.05;
        const xy = (near ? front : back)([p.lng, p.lat]);
        const isFocus = P.focus === p.slug;
        if (xy) {
          ctx.globalAlpha = near ? 1 : 0.25;
          ctx.fillStyle = p.status === 'soon' ? C.faint : C.rec;
          ctx.beginPath(); ctx.arc(xy[0], xy[1], isFocus ? 3.6 : 2.4, 0, Math.PI * 2); ctx.fill();
          if (isFocus && near) {
            ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(xy[0], xy[1], 7 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2); ctx.fill();
          }
        }

        const el = tagEls.current[p.slug];
        const ln = lineEls.current[p.slug];
        if (!el || !ln) continue;
        const fx = Math.sin(t * 0.7 + p.phase) * 5;
        const fy = Math.cos(t * 0.55 + p.phase * 1.3) * 5;
        const ty = top + p.slot * span + fy;
        const gap = P.compact ? 10 : Math.max(24, w * 0.06);
        const tw = el.offsetWidth;
        const tx = p.side === 'left' ? gap + fx : w - gap - tw + fx;
        el.style.transform = `translate(${tx}px, ${ty - tagH / 2}px)`;
        el.style.opacity = near ? (isFocus ? '1' : '0.9') : (P.compact ? '0.18' : '0.3');
        el.classList.toggle('is-back', !near);
        el.classList.toggle('is-focus', isFocus);
        if (near && xy) {
          const ax = p.side === 'left' ? tx + tw : tx;
          ln.setAttribute('x1', ax); ln.setAttribute('y1', ty);
          ln.setAttribute('x2', xy[0]); ln.setAttribute('y2', xy[1]);
          ln.style.opacity = isFocus ? '0.9' : '0.35';
        } else {
          ln.style.opacity = '0';
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); themeObs.disconnect(); };
  }, [places]);

  // ── gestures ──────────────────────────────────────────────────────────────
  const geoAt = (e) => {
    const s = st.current;
    const r = wrap.current.getBoundingClientRect();
    const { w, h } = s.size;
    const R = Math.min(h * radius, w * (compact ? 0.27 : 0.22)) * s.k;
    const pr = geoOrthographic().clipAngle(90).scale(R).translate([w / 2, h / 2]).rotate([s.rot[0], s.rot[1], 0]);
    const x = e.clientX - r.left; const y = e.clientY - r.top;
    if (Math.hypot(x - w / 2, y - h / 2) > R) return null;
    const ll = pr.invert([x, y]);
    return ll ? s.features.find((f) => geoContains(f, ll)) || null : null;
  };

  const onPointerDown = (e) => {
    if (e.target.closest('a,button')) return;
    const s = st.current;
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.moved = false;
    s.drag = { rot: [...s.rot], k: s.kTarget, pts: [...s.pointers.values()].map((p) => ({ ...p })) };
    s.fly = null;
  };

  const onPointerMove = (e) => {
    const s = st.current;
    if (!s.drag) {
      if (e.pointerType === 'mouse') {
        const f = geoAt(e);
        s.hoverGeo = f?.properties.name || null;
        wrap.current.style.cursor = f ? 'pointer' : 'grab';
      }
      return;
    }
    if (!s.pointers.has(e.pointerId)) return;
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...s.pointers.values()];
    const d = s.drag;
    if (pts.length >= 2 && d.pts.length >= 2) {
      const d0 = Math.hypot(d.pts[0].x - d.pts[1].x, d.pts[0].y - d.pts[1].y) || 1;
      const d1 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const k = Math.min(MAX_ZOOM, Math.max(1, d.k * (d1 / d0)));
      s.kTarget = k; s.moved = true;
      onZoom?.(k);
      return;
    }
    const dx = pts[0].x - d.pts[0].x;
    const dy = pts[0].y - d.pts[0].y;
    if (!s.moved && Math.hypot(dx, dy) < 6) return;
    if (!s.moved) e.currentTarget.setPointerCapture?.(e.pointerId);
    s.moved = true;
    wrap.current.style.cursor = 'grabbing';
    const sens = 0.28 / s.k;
    s.rot = [d.rot[0] + dx * sens, Math.max(-70, Math.min(70, d.rot[1] - dy * sens))];
    s.idleUntil = performance.now() + 4000;
  };

  const onPointerUp = (e) => {
    const s = st.current;
    s.pointers.delete(e.pointerId);
    if (s.pointers.size) {
      s.drag = { rot: [...s.rot], k: s.kTarget, pts: [...s.pointers.values()].map((p) => ({ ...p })) };
      return;
    }
    s.drag = null;
    if (wrap.current) wrap.current.style.cursor = 'grab';
    if (s.moved || e.type === 'pointercancel') return;
    const f = geoAt(e);
    if (!f) return;
    const name = f.properties.name;
    const ours = litRef.current[name];
    s.fly = { from: [...s.rot], to: (() => { const c = geoCentroid(f); return [-c[0], -c[1]]; })(), t0: performance.now() };
    s.idleUntil = Infinity;
    // Fit the country: zoom so its longest side fills about half the globe.
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    const ext = Math.max(Math.abs(x1 - x0) > 180 ? 360 - Math.abs(x1 - x0) : Math.abs(x1 - x0), Math.abs(y1 - y0));
    const k = Math.min(MAX_ZOOM, Math.max(1.4, 50 / Math.max(ext, 5)));
    s.kTarget = k;
    onZoom?.(k);
    onCountry?.(ours?.slug || null, name);
  };

  const onPointerLeave = () => { st.current.hoverGeo = null; };

  // ctrl/⌘ + wheel or trackpad pinch zooms
  useEffect(() => {
    const el = wrap.current;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const s = st.current;
      s.kTarget = Math.min(MAX_ZOOM, Math.max(1, s.kTarget * Math.exp(-e.deltaY * 0.01)));
      props.current.onZoom?.(s.kTarget);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={wrap}
      className={`m-globe relative w-full h-full overflow-hidden select-none ${className}`}
      style={{ touchAction: 'pan-y', cursor: 'grab', ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      role="group"
      aria-label="Globe of places Jon has filmed. Drag to spin."
    >
      <div className="m-dust" aria-hidden="true" />
      <canvas ref={canvas} className="absolute inset-0" aria-hidden="true" />
      <svg ref={svg} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        {places.map((p) => (
          <line key={p.slug} ref={(el) => { lineEls.current[p.slug] = el; }} className="g-line" style={{ opacity: 0 }} />
        ))}
      </svg>
      {places.map((p) => {
        const status = p.status || 'filmed';
        return (
          <Link
            key={p.slug}
            ref={(el) => { tagEls.current[p.slug] = el; }}
            to={`/travel/${p.slug}`}
            className={`g-tag is-${p.side} is-${status} ${compact ? 'is-compact' : ''}`}
            aria-label={`${p.name}${status === 'edit' ? ', in the edit' : status === 'soon' ? ', coming soon' : ''}`}
            onMouseEnter={() => { st.current.hoverGeo = COUNTRIES.find((c) => c.slug === p.country)?.geo || null; onFocus?.(p.slug); }}
            onMouseLeave={() => { st.current.hoverGeo = null; }}
            onFocus={() => onFocus?.(p.slug)}
            onClick={(e) => {
              // Touch: first tap spins the globe to the city, second opens it.
              if (isTouchUi() && focus !== p.slug) { e.preventDefault(); onPin?.(p.slug); }
            }}
          >
            {(compact ? shortName(p.name) : p.name).toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
