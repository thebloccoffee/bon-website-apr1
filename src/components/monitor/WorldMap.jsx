import React, { useEffect, useMemo, useState } from 'react';
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

const pct = ([x, y]) => ({ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` });

/**
 * Flat world map. Countries with content are lit, visited-but-unpublished ones
 * are dimmed, cities are pins. `zoom` scales around the focused city.
 * Props: focus (city slug), onFocus(slug), counts ({countrySlug: n}),
 * zoom (1..6), log (bool), showLabels, interactive.
 */
export default function WorldMap({ focus, onFocus, counts = {}, zoom = 1, log = false, showLabels = true, interactive = true, className = '', style, center }) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let live = true;
    loadMap().then((m) => live && setMap(m));
    return () => { live = false; };
  }, []);

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

  const focusPlace = focus ? pins.find((p) => p.slug === focus) : null;
  // Zoom keeps `center` (map units; defaults to the focused pin) in the middle of the frame.
  const c = center || focusPlace?.xy || [MAP_W / 2, MAP_H / 2];
  const fx = c[0] / MAP_W;
  const fy = c[1] / MAP_H;
  const origin = `${fx * 100}% ${fy * 100}%`;
  const transform = zoom > 1 ? `translate(${(0.5 - fx) * 100}%, ${(0.5 - fy) * 100}%) scale(${zoom})` : 'none';
  const inv = 1 / zoom;

  return (
    <div className={`m-map relative w-full ${className}`} style={{ aspectRatio: `${MAP_W} / ${MAP_H}`, ...style }}>
      <div className={`m-zoom absolute inset-0 ${log ? 'm-log' : ''}`} style={{ transformOrigin: origin, transform }}>
        {map ? (
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 w-full h-full" role="img" aria-label="World map of places Jon has filmed">
            {map.countries.map((c) => (
              <path key={c.n} d={c.d} className={`land ${geoClass[c.n] || ''}`} />
            ))}
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
              className={`m-pin is-${status}`}
              style={{ ...pct(p.xy), transform: `scale(${inv})` }}
              aria-label={`${p.name}${status === 'edit' ? ', in the edit' : status === 'soon' ? ', coming soon' : ''}`}
              onMouseEnter={onFocus ? () => onFocus(p.slug) : undefined}
              onFocus={onFocus ? () => onFocus(p.slug) : undefined}
            />
          );
        })}

        {focusPlace && (
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ ...pct(focusPlace.xy), width: 44, height: 44, margin: '-22px 0 0 -22px', transform: `scale(${inv})` }}>
            <span className="m-br tl" /><span className="m-br tr" /><span className="m-br bl" /><span className="m-br brr" />
          </span>
        )}

        {showLabels && zoom === 1 &&
          COUNTRIES.filter((c) => counts[c.slug] && LABELS[c.slug]).map((c) => (
            <span key={c.slug} className="m-mono absolute pointer-events-none whitespace-nowrap hidden md:block" style={{ ...pct(LABELS[c.slug]), fontSize: 10, letterSpacing: '0.08em', color: 'var(--m-dim)' }}>
              {c.code} {counts[c.slug]}
            </span>
          ))}
      </div>
    </div>
  );
}
