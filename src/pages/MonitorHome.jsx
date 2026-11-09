import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MonitorHeader from '@/components/monitor/MonitorHeader';
import WorldMap, { WORLD, MAX_K, fitBox } from '@/components/monitor/WorldMap';
import { useMapContent } from '@/components/monitor/useMapContent';
import FocusCard from '@/components/monitor/FocusCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { COUNTRIES, PLACES, COUNTRY_COLORS, MAP_W, MAP_H, findPlace, itemsFor, countryOf, citiesIn, project } from '@/lib/places';
import '@/components/monitor/monitor.css';

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
// bottom like clips on an edit timeline.
export default function MonitorHome() {
  const { all, countryCounts, cityCounts, cityFirst, latestCity } = useMapContent();
  const phone = useIsMobile();
  const b = phone ? PHONE_B : 1;

  const [hover, setHover] = useState(null);
  const [sel, setSel] = useState(null); // { slug } of a city or country, or { name } of a country with nothing yet
  const [view, setView] = useState(WORLD);
  const touched = useRef(false);
  const mapRef = useRef(null);

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

  const clips = useMemo(
    () => [
      ...PLACES.filter((p) => cityCounts[p.slug]).sort((a, b) => (cityFirst[a.slug] || 0) - (cityFirst[b.slug] || 0)),
      ...PLACES.filter((p) => !cityCounts[p.slug] && p.status === 'edit'),
    ],
    [cityCounts, cityFirst]
  );

  const card = sel?.name
    ? { key: `geo-${sel.name}`, label: '▸ IN FOCUS', name: sel.name, note: 'Not filmed yet. Maybe the next trip.', muted: true }
    : place && preview
      ? {
          key: place.slug,
          href: `/travel/${place.slug}`,
          label: sel || hover ? '▸ IN FOCUS' : '▸ LATEST',
          name: place.name,
          meta: `${(preview.where || '').toUpperCase()} · ${statusLine(place, preview)}`,
          latest: preview.latest,
        }
      : null;

  return (
    <div className="monitor md:min-h-screen flex flex-col gap-3 px-4 md:px-6 pt-4 pb-5">
      <MonitorHeader />

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
        <FocusCard item={card} className="absolute hidden md:block" style={{ right: 76, bottom: '11%', width: 380 }} />

        <span className="m-mono absolute left-4 hidden md:flex items-center gap-4 pointer-events-none" style={{ bottom: zoomed ? 'calc(11% + 56px)' : '11%', fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-dim)' }}>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--m-rec)' }} />FILMED</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full border" style={{ borderColor: 'var(--m-rec)' }} />IN THE EDIT</span>
          <span>{COUNTRIES.length} COUNTRIES · {all.length || '—'} STORIES</span>
        </span>
      </section>

      {/* phone: card for the selected place */}
      <FocusCard item={card || { key: 'empty', label: '▸ TAP A PIN OR A COUNTRY', name: 'Explore the map', muted: true }} size="md" className="md:hidden" />

      {/* places timeline: every city filmed, oldest to newest; in-the-edit last */}
      <section aria-label="Places" className="flex">
        <div className="flex-1 min-w-0 border" style={{ borderColor: 'var(--m-line)', background: 'var(--m-panel)' }}>
          <div className="m-mono flex justify-between px-3 py-1.5" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-faint)', borderBottom: '1px solid var(--m-line)' }}>
            <span>V1 · PLACES</span><span>FIRST → LATEST</span>
          </div>
          <div className="flex overflow-x-auto p-2 snap-x snap-mandatory md:snap-none">
            {clips.map((p) => {
              const [bg, ink] = COUNTRY_COLORS[p.country] || ['#B49A72', '#111'];
              const edit = !cityCounts[p.slug];
              const tap = (e) => {
                if (!phone) return;
                e.preventDefault();
                select(p.slug, { scroll: true });
              };
              return (
                <Link
                  key={p.slug}
                  to={`/travel/${p.slug}`}
                  className={`m-clip snap-start ${edit ? 'is-edit' : ''}`}
                  style={{ flex: `${Math.min(6, Math.max(2, cityCounts[p.slug] || 2))} ${phone ? 0 : 1} auto`, ...(edit ? {} : { background: bg, color: ink }) }}
                  onMouseEnter={() => setHover(p.slug)}
                  onFocus={() => setHover(p.slug)}
                  onClick={tap}
                  title={`${p.name}, ${countryOf(p.country)?.name}`}
                >
                  {p.name.toUpperCase()}{edit ? ' · IN THE EDIT' : ''}
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
