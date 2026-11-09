import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MonitorHeader from '@/components/monitor/MonitorHeader';
import WorldMap, { WORLD, MAX_K, fitBox } from '@/components/monitor/WorldMap';
import { useMapContent, thumbFor } from '@/components/monitor/useMapContent';
import { useHasProducts } from '@/hooks/use-has-products';
import { useIsMobile } from '@/hooks/use-mobile';
import { COUNTRIES, TRIPS, MAP_W, MAP_H, findPlace, itemsFor, countryOf, citiesIn, project } from '@/lib/places';
import '@/components/monitor/monitor.css';

const LOOK_KEY = 'jb-look';
const readLook = () => {
  try { return localStorage.getItem(LOOK_KEY) === 'log'; } catch { return false; }
};

const MAP_ASPECT = MAP_W / MAP_H;
const PHONE_ASPECT = 4 / 5; // tall frame on phones: the map fills it and you swipe sideways
const PHONE_B = MAP_ASPECT / PHONE_ASPECT;

/** A view that frames a city or a whole country. */
function viewFor(place, b, current) {
  if (!place) return WORLD;
  if (place.kind === 'city') {
    const [x, y] = project(place.lat, place.lng);
    return { k: Math.max(current?.k || 1, 4 / b, 1.6), cx: x, cy: y };
  }
  const pts = citiesIn(place.slug).map((c) => project(c.lat, c.lng));
  if (!pts.length) return WORLD;
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return fitBox({ x: x - 12, y: y - 12, width: Math.max(...xs) - x + 24, height: Math.max(...ys) - y + 24 }, b, 0.5);
}

// Home: the world map seen through Jon's camera monitor. Trips run along the
// bottom like clips on an edit timeline; LOG / GRADED flattens or grades it.
export default function MonitorHome() {
  const { all, countryCounts, cityCounts, latestCity } = useMapContent();
  const hasShop = useHasProducts();
  const phone = useIsMobile();
  const b = phone ? PHONE_B : 1;

  const [log, setLog] = useState(readLook);
  const [hover, setHover] = useState(null);
  const [sel, setSel] = useState(null); // { slug } of a city or country, or { name } of a country with nothing yet
  const [view, setView] = useState(WORLD);
  const touched = useRef(false);
  const mapRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(LOOK_KEY, log ? 'log' : 'graded'); } catch { /* private mode */ }
  }, [log]);

  // On a phone, open on the latest place instead of the middle of the Atlantic.
  useEffect(() => {
    if (touched.current) return;
    const p = latestCity ? findPlace(latestCity) : null;
    if (phone && p) setView({ k: 1, cx: project(p.lat, p.lng)[0], cy: MAP_H / 2 });
    else setView(WORLD);
  }, [phone, latestCity]);

  const changeView = useCallback((next) => {
    touched.current = true;
    setView((cur) => (typeof next === 'function' ? next(cur) : next));
  }, []);

  const select = useCallback((slug, { zoom = true, scroll = false } = {}) => {
    const place = findPlace(slug);
    if (!place) return;
    setSel({ slug });
    if (zoom) {
      // A country frames its whole outline, like tapping it on the map.
      const shape = place.kind === 'country' ? mapRef.current?.querySelector(`path[data-geo="${CSS.escape(place.geo)}"]`) : null;
      changeView((cur) => (shape ? fitBox(shape.getBBox(), b) : viewFor(place, b, cur)));
    }
    if (scroll) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [b, changeView]);

  const onCountry = useCallback((slug, bbox, name) => {
    if (slug) { setSel({ slug }); changeView(fitBox(bbox, b)); }
    else { setSel({ name }); changeView(fitBox(bbox, b)); }
  }, [b, changeView]);

  const activeSlug = sel?.slug || hover || latestCity;
  const place = activeSlug ? findPlace(activeSlug) : null;
  const preview = useMemo(() => {
    if (!place) return null;
    const items = itemsFor(place, all);
    const vids = items.filter((i) => i._type === 'video');
    return {
      count: items.length,
      latest: vids[0] || null,
      where: place.kind === 'city' ? countryOf(place.country)?.name : `${citiesIn(place.slug).length} places`,
    };
  }, [place, all]);
  const focusCity = place?.kind === 'city' ? place.slug : null;
  const zoomed = view.k > 1.01 || (phone && touched.current);

  const zoomBy = (f) => changeView((cur) => ({ ...cur, k: Math.min(MAX_K, Math.max(1, cur.k * f)) }));
  const reset = () => { setSel(null); changeView(phone && latestCity ? { k: 1, cx: view.cx, cy: MAP_H / 2 } : WORLD); };

  const statusLine = (p, pv) =>
    pv?.count ? `${pv.count} ${pv.count === 1 ? 'STORY' : 'STORIES'}` : p?.status === 'edit' ? 'IN THE EDIT' : 'COMING SOON';

  return (
    <div className="monitor md:min-h-screen flex flex-col gap-3 px-4 md:px-6 pt-4 pb-5">
      <MonitorHeader profile={log ? 'S-LOG3 · S-GAMUT3.CINE' : 'GRADED · JOOONBON LOOK'} />

      <h1 className="sr-only">jooonbon: every place Jon Bon Tabas has filmed, on one map</h1>

      {/* the frame */}
      <section ref={mapRef} aria-label="World map" className="relative md:flex-1 flex items-center justify-center overflow-hidden border md:min-h-[300px]" style={{ borderColor: 'var(--m-line)', background: 'var(--m-ocean)' }}>
        <WorldMap
          focus={focusCity}
          onFocus={phone ? undefined : setHover}
          onPin={(slug) => select(slug)}
          onCountry={onCountry}
          counts={countryCounts}
          view={view}
          onViewChange={changeView}
          aspect={phone ? PHONE_ASPECT : MAP_ASPECT}
          log={log}
          style={phone ? undefined : { width: 'min(100%, calc((100svh - 250px) * 1.92))' }}
        />

        {/* 2.39 letterbox and frame lines: decoration only */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[9%] pointer-events-none hidden md:block" style={{ background: 'color-mix(in srgb, var(--m-bg) 60%, transparent)', borderBottom: '1px solid var(--m-line-2)' }} />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[9%] pointer-events-none hidden md:block" style={{ background: 'color-mix(in srgb, var(--m-bg) 60%, transparent)', borderTop: '1px solid var(--m-line-2)' }} />
        <span aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 12 }}>
          <span className="m-br tl" style={{ width: 22, height: 22 }} /><span className="m-br tr" style={{ width: 22, height: 22 }} />
          <span className="m-br bl" style={{ width: 22, height: 22 }} /><span className="m-br brr" style={{ width: 22, height: 22 }} />
        </span>
        <span aria-hidden="true" className="m-mono absolute hidden sm:block pointer-events-none" style={{ left: 48, top: 16, fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-dim)' }}>2.39:1</span>

        {/* zoom controls: bottom-right on phones, middle-right on desktop */}
        <div className="absolute right-3 bottom-3 md:bottom-auto md:right-4 md:top-1/2 md:-translate-y-1/2 flex flex-col border" style={{ borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 85%, transparent)' }}>
          <button type="button" aria-label="Zoom in" disabled={view.k >= MAX_K} onClick={() => zoomBy(2)} className="m-mono w-11 h-11 disabled:opacity-30 text-lg" style={{ borderBottom: '1px solid var(--m-line-2)' }}>+</button>
          <button type="button" aria-label="Zoom out" disabled={view.k <= 1} onClick={() => zoomBy(0.5)} className="m-mono w-11 h-11 disabled:opacity-30 text-lg">−</button>
        </div>
        {zoomed && (
          <button type="button" onClick={reset} className="m-mono absolute left-3 bottom-3 md:left-4 md:bottom-[11%] min-h-[44px] px-3 border" style={{ fontSize: 11, letterSpacing: '0.1em', borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 85%, transparent)' }}>
            ⤢ WORLD
          </button>
        )}
        {!zoomed && (
          <span className="m-mono absolute left-3 bottom-3 md:hidden pointer-events-none px-2 py-1" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--m-dim)', background: 'color-mix(in srgb, var(--m-bg) 70%, transparent)' }}>
            SWIPE · PINCH · TAP A COUNTRY
          </span>
        )}

        {/* desktop: what's in focus */}
        {place && preview && (
          <Link to={`/travel/${place.slug}`} className="absolute hidden md:flex gap-3 p-2 border" style={{ right: 76, top: '12%', width: 240, borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 88%, transparent)' }}>
            {preview.latest && (
              <img src={thumbFor(preview.latest)} alt="" width="72" height="128" loading="lazy" className="block object-cover" style={{ width: preview.latest.format === 'short' ? 64 : 96, aspectRatio: preview.latest.format === 'short' ? '9 / 16' : '16 / 9' }} />
            )}
            <span className="flex flex-col gap-1 min-w-0">
              <span className="m-mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--m-rec)' }}>{sel || hover ? '▸ IN FOCUS' : '▸ LATEST'}</span>
              <span className="font-semibold leading-tight" style={{ fontSize: 18 }}>{place.name}</span>
              <span className="m-mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--m-dim)' }}>{(preview.where || '').toUpperCase()} · {statusLine(place, preview)}</span>
              {preview.latest && <span className="text-xs leading-snug line-clamp-2 mt-auto" style={{ color: 'var(--m-dim)' }}>{preview.latest.title}</span>}
              <span className="m-mono mt-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>OPEN →</span>
            </span>
          </Link>
        )}

        <span className="m-mono absolute left-4 hidden md:flex items-center gap-4 pointer-events-none" style={{ bottom: zoomed ? 'calc(11% + 56px)' : '11%', fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-dim)' }}>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--m-rec)' }} />FILMED</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full border" style={{ borderColor: 'var(--m-rec)' }} />IN THE EDIT</span>
          <span>{COUNTRIES.length} COUNTRIES · {all.length || '—'} STORIES</span>
        </span>
      </section>

      {/* phone: card for the selected place */}
      <div className="md:hidden border" style={{ borderColor: 'var(--m-line)', background: 'var(--m-panel)' }} aria-live="polite">
        {sel?.name ? (
          <div className="p-3">
            <p className="m-mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--m-faint)' }}>▸ IN FOCUS</p>
            <p className="font-semibold text-lg mt-1">{sel.name}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--m-dim)' }}>Not filmed yet. Maybe the next trip.</p>
          </div>
        ) : place && preview ? (
          <Link to={`/travel/${place.slug}`} className="flex gap-3 p-3 items-stretch">
            {preview.latest && (
              <img src={thumbFor(preview.latest)} alt="" width="72" height="128" loading="lazy" className="block object-cover shrink-0" style={{ width: preview.latest.format === 'short' ? 58 : 112, aspectRatio: preview.latest.format === 'short' ? '9 / 16' : '16 / 9' }} />
            )}
            <span className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="m-mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--m-rec)' }}>{sel ? '▸ IN FOCUS' : '▸ LATEST'}</span>
              <span className="font-semibold text-lg leading-tight">{place.name}</span>
              <span className="m-mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--m-dim)' }}>{(preview.where || '').toUpperCase()} · {statusLine(place, preview)}</span>
              {preview.latest && <span className="text-xs leading-snug line-clamp-2" style={{ color: 'var(--m-dim)' }}>{preview.latest.title}</span>}
            </span>
            <span className="m-mono self-center shrink-0 px-3 py-2 border" style={{ fontSize: 11, letterSpacing: '0.1em', borderColor: 'var(--m-line-2)' }}>OPEN →</span>
          </Link>
        ) : (
          <p className="p-3 text-sm" style={{ color: 'var(--m-dim)' }}>Tap a pin or a country.</p>
        )}
      </div>

      {/* look switch + trips timeline */}
      <section aria-label="Look and trips" className="flex flex-wrap gap-3 md:gap-4 items-stretch">
        <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2">
          <div role="group" aria-label="Look" className="m-mono flex border" style={{ borderColor: 'var(--m-line-2)', fontSize: 12, letterSpacing: '0.1em' }}>
            {[['LOG', true], ['GRADED', false]].map(([label, val]) => (
              <button key={label} type="button" aria-pressed={log === val} onClick={() => setLog(val)} className="min-h-[44px] px-4"
                style={log === val ? { background: 'var(--m-text)', color: 'var(--m-bg)' } : { color: 'var(--m-dim)' }}>
                {label}
              </button>
            ))}
          </div>
          {hasShop && <Link to="/shop" className="m-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--m-dim)' }}>GET THIS GRADE →</Link>}
        </div>

        <div className="flex-1 min-w-0 border" style={{ minWidth: 'min(100%, 560px)', borderColor: 'var(--m-line)', background: 'var(--m-panel)' }}>
          <div className="m-mono flex justify-between px-3 py-1.5" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-faint)', borderBottom: '1px solid var(--m-line)' }}>
            <span>V1 · TRIPS</span><span>{TRIPS[0]?.when?.toUpperCase()} → NOW</span>
          </div>
          <div className="flex overflow-x-auto p-2 snap-x">
            {TRIPS.map((t) => {
              const target = findPlace(t.to);
              const tap = (e) => {
                if (!phone) return;
                e.preventDefault();
                select(t.to, { scroll: true });
              };
              return (
                <Link
                  key={t.label}
                  to={`/travel/${t.to}`}
                  className={`m-clip snap-start ${t.status === 'edit' ? 'is-edit' : ''}`}
                  style={{ flex: `${Math.min(8, Math.max(2, cityCounts[t.to] || countryCounts[t.to] || 2))} 0 auto`, ...(t.status === 'edit' ? {} : { background: t.color, color: t.ink || '#111' }) }}
                  onMouseEnter={() => target?.kind === 'city' && setHover(t.to)}
                  onFocus={() => target?.kind === 'city' && setHover(t.to)}
                  onClick={tap}
                  title={`${t.label} · ${t.when}`}
                >
                  {t.label.toUpperCase()}{t.status === 'edit' ? ' · IN THE EDIT' : ''}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* countries: tap to fly the map there */}
      <nav aria-label="Countries" className="m-mono flex gap-2 overflow-x-auto md:flex-wrap pb-1 -mx-4 px-4 md:mx-0 md:px-0" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
        {COUNTRIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => select(c.slug, { scroll: phone })}
            aria-pressed={sel?.slug === c.slug}
            className="shrink-0 min-h-[40px] px-3 border whitespace-nowrap"
            style={{
              borderColor: sel?.slug === c.slug ? 'var(--m-text)' : 'var(--m-line)',
              color: countryCounts[c.slug] ? 'var(--m-text)' : 'var(--m-faint)',
            }}
          >
            {c.name.toUpperCase()} {countryCounts[c.slug] || (c.status === 'soon' ? '· SOON' : '')}
          </button>
        ))}
      </nav>
    </div>
  );
}
