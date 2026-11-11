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

// Kodak Portra 400-ish: soft cyan sea, muted sage land, warm skin-tone peach,
// creamy highlights. Same in light and dark mode.
const PORTRA = {
  seaLight: '#9fc2bd', sea: '#5f9294', seaDeep: '#2c5660',
  land: '#a9ae86', sand: '#d6c3a0', peach: '#e6a688', peachHot: '#f2bf9c',
  border: 'rgba(74, 58, 44, 0.35)', cream: '#f4e6cf',
};

const shortName = (n) => n.replace(/, BC$/, '').replace(' National Park', '');

/**
 * A see-through spinning globe. Cities on the near side get callout labels
 * beside the globe, joined to their pins by bent leader lines. Drag to spin, pinch or
 * ctrl+wheel to zoom, tap a country to fly there.
 *
 * `flyTo` = { slug } | { world: true }, with an `n` that changes per request.
 * `zoom` is controlled; `onZoom(k)` reports pinch and wheel zooms.
 */
export default function GlobeMap({
  focus, onFocus, onLeave, onPin, onCountry, counts = {}, cityCounts = {}, flyTo, zoom = 1, onZoom,
  spin = true, compact = false, labels = true, radius = 0.31, className = '', style,
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

  const places = useMemo(() => PLACES.map((p, i) => ({ ...p, n: String(i + 1).padStart(2, '0') })), []);

  const litGeo = useMemo(() => {
    const out = {};
    for (const c of COUNTRIES) out[c.geo] = { slug: c.slug, soon: c.status === 'soon' && !counts[c.slug] };
    return out;
  }, [counts]);
  const litRef = useRef(litGeo);
  litRef.current = litGeo;

  // Keep props readable from the animation loop without restarting it.
  const props = useRef({});
  props.current = { focus, onFocus, onPin, onCountry, onZoom, spin, compact, radius };

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
    let live = true;
    const go = (center) => {
      if (!live || !center) return;
      // `snap` jumps straight there (a page opening on a place); otherwise glide.
      const t0 = flyTo.snap ? performance.now() - 5000 : performance.now();
      s.fly = { from: [...s.rot], to: [-center[0], -center[1]], t0 };
      s.idleUntil = Infinity;
    };
    const p = placeOf(flyTo.slug);
    if (p) { go([p.lng, p.lat]); return () => { live = false; }; }
    // A country needs its shape, which may still be loading.
    const c = COUNTRIES.find((x) => x.slug === flyTo.slug || x.name === flyTo.name);
    loadWorld().then((features) => {
      const f = features.find((x) => x.properties.name === (c?.geo || flyTo.name));
      go(f ? geoCentroid(f) : null);
    });
    return () => { live = false; };
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
    const pf = geoPath(front, ctx);
    const grid = geoGraticule10();
    const routes = ROUTES.map((r) => ({ type: 'LineString', coordinates: r.map(placeOf).filter(Boolean).map((p) => [p.lng, p.lat]) }));

    loadWorld().then((f) => { s.features = f; });

    // Film grain: one still noise tile, clipped to the globe.
    const noise = document.createElement('canvas');
    noise.width = noise.height = 192;
    const nctx = noise.getContext('2d');
    const img = nctx.createImageData(192, 192);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = 128 + (Math.random() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
    const grain = ctx.createPattern(noise, 'repeat');

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
      front.scale(R).translate([cx, cy]).rotate([s.rot[0], s.rot[1], 0]);
      const center = [-s.rot[0], -s.rot[1]];

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // ── Portra 400 globe: teal-cyan sea, sage land, peach for Jon's countries,
      //    warm cream highlight, soft falloff, grain. ──
      const sphere = () => { ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); };

      // atmosphere: a warm glow just outside the rim
      ctx.save();
      sphere();
      ctx.shadowColor = 'rgba(240, 190, 150, 0.35)';
      ctx.shadowBlur = R * 0.18;
      ctx.fillStyle = PORTRA.seaDeep;
      ctx.fill();
      ctx.restore();

      // sea
      const sea = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      sea.addColorStop(0, PORTRA.seaLight);
      sea.addColorStop(0.55, PORTRA.sea);
      sea.addColorStop(1, PORTRA.seaDeep);
      sphere(); ctx.fillStyle = sea; ctx.globalAlpha = 1; ctx.fill();

      ctx.save();
      sphere(); ctx.clip();

      // land
      ctx.beginPath();
      for (const f of s.features) if (!litRef.current[f.properties.name]) pf(f);
      ctx.fillStyle = PORTRA.land; ctx.fill();
      for (const f of s.features) {
        const lit = litRef.current[f.properties.name];
        const name = f.properties.name;
        const hot = name === s.hoverGeo || name === s.focusGeo;
        if (!lit && !hot) continue;
        ctx.beginPath(); pf(f);
        ctx.fillStyle = hot ? PORTRA.peachHot : lit?.soon ? PORTRA.sand : PORTRA.peach;
        ctx.fill();
      }
      // borders: thin warm-brown lines
      ctx.beginPath(); for (const f of s.features) pf(f);
      ctx.strokeStyle = PORTRA.border; ctx.lineWidth = 0.6; ctx.stroke();

      // dotted lat/long, cream
      ctx.globalAlpha = 0.35; ctx.strokeStyle = PORTRA.cream; ctx.lineWidth = 0.8; ctx.setLineDash([1, 4]);
      ctx.beginPath(); pf(grid); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      // light: warm highlight top-left, soft teal falloff to the edge
      const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx - R * 0.4, cy - R * 0.45, R * 0.95);
      hi.addColorStop(0, 'rgba(255, 238, 210, 0.42)');
      hi.addColorStop(1, 'rgba(255, 238, 210, 0)');
      ctx.fillStyle = hi; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const edge = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      edge.addColorStop(0, 'rgba(18, 38, 44, 0)');
      edge.addColorStop(1, 'rgba(18, 38, 44, 0.55)');
      ctx.fillStyle = edge; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // grain
      // grain stays still on screen, like grain baked into a print
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = grain;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // rim
      sphere(); ctx.strokeStyle = 'rgba(245, 225, 195, 0.45)'; ctx.lineWidth = 1; ctx.stroke();

      // trip routes
      ctx.globalAlpha = 0.9; ctx.strokeStyle = C.rec; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); for (const r of routes) pf(r); ctx.stroke();
      ctx.setLineDash([]);

      // pins
      const t = now / 1000;
      const sides = { left: [], right: [] };
      for (const p of places) {
        const near = geoDistance([p.lng, p.lat], center) < Math.PI / 2 - 0.08;
        const xy = near ? front([p.lng, p.lat]) : null;
        const isFocus = P.focus === p.slug;
        if (xy) {
          ctx.globalAlpha = near ? 1 : 0.2;
          ctx.fillStyle = p.status === 'soon' ? C.faint : C.rec;
          // halation: red light bleeding round the pin, like highlights on film
          ctx.shadowColor = near && p.status !== 'soon' ? C.rec : 'transparent';
          ctx.shadowBlur = isFocus ? 14 : 8;
          ctx.beginPath(); ctx.arc(xy[0], xy[1], isFocus ? 3.6 : 2.6, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
          ctx.strokeStyle = PORTRA.cream; ctx.lineWidth = 1; ctx.stroke();
          if (isFocus && near) {
            ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(xy[0], xy[1], 7 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2); ctx.fill();
          }
        }
        const el = tagEls.current[p.slug];
        const ln = lineEls.current[p.slug];
        if (!el || !ln) continue;
        if (!near || !xy) {
          el.style.opacity = '0'; el.style.pointerEvents = 'none'; el.tabIndex = -1;
          ln.style.opacity = '0';
          p._y = null;
          continue;
        }
        // elbow: a point just outside the rim, straight out from the centre
        const dx = xy[0] - cx; const dy = xy[1] - cy;
        const d = Math.hypot(dx, dy) || 1;
        const elbow = [cx + (dx / d) * (R + 14), cy + (dy / d) * (R + 14)];
        sides[dx < 0 ? 'left' : 'right'].push({ p, xy, elbow, el, ln, isFocus });
      }

      // callouts: one column each side, hugging the globe, nudged apart
      const gapY = P.compact ? 22 : 24;
      const colOff = P.compact ? 26 : 46;
      for (const side of ['left', 'right']) {
        const list = sides[side].sort((a, b) => a.elbow[1] - b.elbow[1]);
        let y = -Infinity;
        for (const it of list) { it.y = Math.max(it.elbow[1], y + gapY); y = it.y; }
        // keep labels clear of the header (top) and the title/hint (bottom)
        const minY = P.compact ? 70 : 92;
        const maxY = h - (P.compact ? 60 : 130);
        const over = y - maxY;
        if (over > 0) for (const it of list) it.y -= over;
        if (list.length && list[0].y < minY) {
          let yy = minY;
          for (const it of list) { it.y = Math.max(it.y, yy); yy = it.y + gapY; }
        }
        for (const it of list) {
          const { p, el, ln, xy, elbow, isFocus } = it;
          p._y = p._y == null ? it.y : p._y + (it.y - p._y) * Math.min(1, dt / 90);
          const ty = p._y;
          const tw = el.offsetWidth;
          let tx = side === 'left' ? cx - R - colOff - tw : cx + R + colOff;
          tx = Math.max(6, Math.min(w - tw - 6, tx));
          el.style.transform = `translate(${tx}px, ${ty - el.offsetHeight / 2}px)`;
          el.style.opacity = isFocus ? '1' : '0.92';
          el.style.pointerEvents = 'auto'; el.tabIndex = 0;
          el.classList.toggle('is-focus', isFocus);
          el.classList.toggle('is-left', side === 'left');
          el.classList.toggle('is-right', side === 'right');
          const end = side === 'left' ? tx + tw + 6 : tx - 6;
          const bend = side === 'left' ? Math.min(elbow[0], end + 1) : Math.max(elbow[0], end - 1);
          ln.setAttribute('points', `${xy[0].toFixed(1)},${xy[1].toFixed(1)} ${bend.toFixed(1)},${ty.toFixed(1)} ${end.toFixed(1)},${ty.toFixed(1)}`);
          ln.style.opacity = isFocus ? '0.95' : '0.4';
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

  const onPointerLeave = () => { st.current.hoverGeo = null; onLeave?.(); };

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
        {labels && places.map((p) => (
          <polyline key={p.slug} ref={(el) => { lineEls.current[p.slug] = el; }} className="g-line" style={{ opacity: 0 }} />
        ))}
      </svg>
      {labels && places.map((p) => {
        const status = p.status || 'filmed';
        return (
          <Link
            key={p.slug}
            ref={(el) => { tagEls.current[p.slug] = el; }}
            to={`/travel/${p.slug}`}
            className={`g-tag is-${status}`}
            style={{ opacity: 0 }}
            aria-label={`${p.name}${status === 'edit' ? ', in the edit' : status === 'soon' ? ', coming soon' : ''}`}
            onMouseEnter={() => { st.current.hoverGeo = COUNTRIES.find((c) => c.slug === p.country)?.geo || null; onFocus?.(p.slug); }}
            onMouseLeave={() => { st.current.hoverGeo = null; }}
            onFocus={() => onFocus?.(p.slug)}
            onClick={(e) => {
              // Touch: first tap spins the globe to the city, second opens it.
              if (isTouchUi() && focus !== p.slug) { e.preventDefault(); onPin?.(p.slug); }
            }}
          >
            <span className="g-n">{p.n}</span>
            <span className="g-name">{compact ? shortName(p.name) : p.name}</span>
            {cityCounts[p.slug] ? <sup className="g-c">{cityCounts[p.slug]}</sup> : status === 'edit' ? <sup className="g-c">edit</sup> : null}
          </Link>
        );
      })}
    </div>
  );
}
