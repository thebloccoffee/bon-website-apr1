import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MonitorHeader from '@/components/monitor/MonitorHeader';
import GlobeMap, { MAX_ZOOM } from '@/components/monitor/GlobeMap';
import { useMapContent } from '@/components/monitor/useMapContent';
import FocusCard from '@/components/monitor/FocusCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { COUNTRIES, PLACES, COUNTRY_COLORS, findPlace, itemsFor, countryOf, citiesIn } from '@/lib/places';
import '@/components/monitor/monitor.css';

// Home: the world map seen through Jon's camera monitor. Trips run along the
// bottom like clips on an edit timeline.
export default function MonitorHome() {
  const { all, countryCounts, cityCounts, cityFirst, latestCity } = useMapContent();
  const phone = useIsMobile();

  const [hover, setHover] = useState(null);
  const [sel, setSel] = useState(null); // { slug } of a city or country, or { name } of a country with nothing yet
  const [zoom, setZoom] = useState(1);
  const [flyTo, setFlyTo] = useState(null);
  const flyN = useRef(0);
  const mapRef = useRef(null);

  const fly = useCallback((target) => { flyN.current += 1; setFlyTo({ ...target, n: flyN.current }); }, []);

  // Phones open spun to the latest place.
  useEffect(() => {
    if (phone && latestCity) fly({ slug: latestCity });
  }, [phone, latestCity, fly]);

  const select = useCallback((slug, { zoom: z = true, scroll = false } = {}) => {
    const place = findPlace(slug);
    if (!place) return;
    setSel({ slug });
    fly({ slug });
    if (z) setZoom((cur) => Math.max(cur, place.kind === 'country' ? 1.6 : 2.2));
    if (scroll) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [fly]);

  const onCountry = useCallback((slug, name) => {
    setSel(slug ? { slug } : { name });
  }, []);

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
  const zoomed = zoom > 1.01 || Boolean(sel);

  const zoomBy = (f) => setZoom((cur) => Math.min(MAX_ZOOM, Math.max(1, cur * f)));
  const reset = () => { setSel(null); setZoom(1); fly({ world: true }); };

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

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="font-semibold tracking-tight leading-tight" style={{ fontSize: 'clamp(18px, 2.4vw, 26px)' }}>
            Every place I've filmed, on one map.
          </h1>
        </div>
        <a
          href="https://youtube.com/jonbontabas"
          target="_blank"
          rel="noopener noreferrer"
          className="m-mono shrink-0 inline-flex items-center gap-2 min-h-[44px] px-4 border"
          style={{ fontSize: 11, letterSpacing: '0.12em', borderColor: 'var(--m-rec)', color: 'var(--m-text)' }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--m-rec)' }} />
          YOUTUBE ↗
        </a>
      </div>

      {/* the frame */}
      <section ref={mapRef} aria-label="Globe" className="relative overflow-hidden border" style={{ borderColor: 'var(--m-line)', background: 'var(--m-ocean)', height: phone ? 'min(118vw, 560px)' : 'max(460px, calc(100svh - 300px))' }}>
        <GlobeMap
          focus={focusCity}
          onFocus={phone ? undefined : setHover}
          onPin={(slug) => select(slug)}
          onCountry={onCountry}
          counts={countryCounts}
          flyTo={flyTo}
          zoom={zoom}
          onZoom={setZoom}
          spin={!sel && !hover}
          compact={phone}
        />

        {/* 2.39 letterbox and frame lines: decoration only */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[7%] pointer-events-none hidden md:block" style={{ background: 'color-mix(in srgb, var(--m-bg) 60%, transparent)', borderBottom: '1px solid var(--m-line-2)' }} />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[7%] pointer-events-none hidden md:block" style={{ background: 'color-mix(in srgb, var(--m-bg) 60%, transparent)', borderTop: '1px solid var(--m-line-2)' }} />
        <span aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 12 }}>
          <span className="m-br tl" style={{ width: 22, height: 22 }} /><span className="m-br tr" style={{ width: 22, height: 22 }} />
          <span className="m-br bl" style={{ width: 22, height: 22 }} /><span className="m-br brr" style={{ width: 22, height: 22 }} />
        </span>
        <span aria-hidden="true" className="m-mono absolute hidden sm:block pointer-events-none" style={{ left: 48, top: 16, fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-dim)' }}>2.39:1</span>

        {/* bottom centre: hint or reset, plus zoom */}
        <div className="absolute inset-x-0 bottom-3 md:bottom-[8.5%] flex items-center justify-center gap-2 pointer-events-none">
          {zoomed ? (
            <button type="button" onClick={reset} className="m-mono pointer-events-auto min-h-[40px] px-3 border" style={{ fontSize: 11, letterSpacing: '0.1em', borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 85%, transparent)' }}>
              ⤢ WHOLE WORLD
            </button>
          ) : (
            <span className="m-mono whitespace-nowrap px-2" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--m-dim)' }}>
              SPIN THE GLOBE · PICK A CITY
            </span>
          )}
          <div className="flex border pointer-events-auto" style={{ borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 85%, transparent)' }}>
            <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => zoomBy(1.6)} className="m-mono w-10 h-10 disabled:opacity-30 text-lg">+</button>
            <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => zoomBy(1 / 1.6)} className="m-mono w-10 h-10 disabled:opacity-30 text-lg" style={{ borderLeft: '1px solid var(--m-line-2)' }}>−</button>
          </div>
        </div>
      </section>

      {/* what's in focus */}
      <FocusCard item={card || { key: 'empty', label: '▸ TAP A CITY OR A COUNTRY', name: 'Explore the globe', muted: true }} size={phone ? 'md' : 'lg'} />

      {/* places timeline: every city filmed, oldest to newest; in-the-edit last */}
      <section aria-label="Places" className="flex">
        <div className="flex-1 min-w-0 border" style={{ borderColor: 'var(--m-line)', background: 'var(--m-panel)' }}>
          <div className="m-mono flex justify-between px-3 py-1.5" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-faint)', borderBottom: '1px solid var(--m-line)' }}>
            <span>PLACES</span><span>FIRST → LATEST</span>
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
                  title={`${p.name}, ${countryOf(p.country)?.name}${edit ? ' (in the edit)' : ''}`}
                >
                  <span className="m-clip-label">{p.name.toUpperCase()}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* countries: tap to fly the map there */}
      <nav aria-label="Countries" className="m-mono flex gap-2 overflow-x-auto md:flex-wrap pb-1 -mx-4 px-4 md:mx-0 md:px-0" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
        {COUNTRIES.filter((c) => c.status !== 'soon').map((c) => (
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
