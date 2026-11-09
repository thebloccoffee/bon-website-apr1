import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MonitorHeader from '@/components/monitor/MonitorHeader';
import WorldMap from '@/components/monitor/WorldMap';
import { useMapContent, thumbFor } from '@/components/monitor/useMapContent';
import { useHasProducts } from '@/hooks/use-has-products';
import { COUNTRIES, TRIPS, findPlace, itemsFor, countryOf } from '@/lib/places';
import '@/components/monitor/monitor.css';

const LOOK_KEY = 'jb-look';
const readLook = () => {
  try { return localStorage.getItem(LOOK_KEY) === 'log'; } catch { return false; }
};

const ZOOMS = [1, 2, 4];

// Home: the world map seen through Jon's camera monitor. Trips run along the
// bottom like clips on an edit timeline; LOG / GRADED flattens or grades it.
export default function MonitorHome() {
  const { all, videos, countryCounts, cityCounts, latestCity } = useMapContent();
  const hasShop = useHasProducts();
  const [log, setLog] = useState(readLook);
  const [focus, setFocus] = useState(null);
  const [zoomIdx, setZoomIdx] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(LOOK_KEY, log ? 'log' : 'graded'); } catch { /* private mode */ }
  }, [log]);

  const active = focus || latestCity;
  const place = active ? findPlace(active) : null;
  const preview = useMemo(() => {
    if (!place) return null;
    const items = itemsFor(place, all);
    const vids = items.filter((i) => i._type === 'video');
    return { count: items.length, films: vids.length, latest: vids[0] || null, country: countryOf(place.country) };
  }, [place, all]);

  const totalCountries = COUNTRIES.length;
  const totalItems = all.length;

  return (
    <div className="monitor md:min-h-screen flex flex-col gap-3 px-4 md:px-6 pt-4 pb-5">
      <MonitorHeader profile={log ? 'S-LOG3 · S-GAMUT3.CINE' : 'GRADED · JOOONBON LOOK'} />

      <h1 className="sr-only">jooonbon: every place Jon Bon Tabas has filmed, on one map</h1>

      {/* the frame */}
      <section aria-label="World map" className="relative md:flex-1 flex items-center justify-center overflow-hidden border py-[12%] md:py-0 md:min-h-[300px]" style={{ borderColor: 'var(--m-line)', background: 'var(--m-ocean)' }}>
        <WorldMap focus={active} onFocus={setFocus} counts={countryCounts} zoom={ZOOMS[zoomIdx]} log={log} style={{ width: 'min(100%, calc((100svh - 250px) * 1.92))' }} />

        {/* 2.39 letterbox, frame lines, centre cross: decoration only */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[9%] pointer-events-none" style={{ background: 'color-mix(in srgb, var(--m-bg) 60%, transparent)', borderBottom: '1px solid var(--m-line-2)' }} />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[9%] pointer-events-none" style={{ background: 'color-mix(in srgb, var(--m-bg) 60%, transparent)', borderTop: '1px solid var(--m-line-2)' }} />
        <span aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 16 }}>
          <span className="m-br tl" style={{ width: 26, height: 26 }} /><span className="m-br tr" style={{ width: 26, height: 26 }} />
          <span className="m-br bl" style={{ width: 26, height: 26 }} /><span className="m-br brr" style={{ width: 26, height: 26 }} />
        </span>
        <span aria-hidden="true" className="m-mono absolute hidden sm:block" style={{ left: 52, top: 20, fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-dim)' }}>2.39:1</span>

        {/* zoom */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col border" style={{ borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 80%, transparent)' }}>
          <button type="button" aria-label="Zoom in" disabled={zoomIdx === ZOOMS.length - 1} onClick={() => setZoomIdx((z) => Math.min(z + 1, ZOOMS.length - 1))} className="m-mono w-11 h-11 disabled:opacity-30" style={{ borderBottom: '1px solid var(--m-line-2)' }}>+</button>
          <button type="button" aria-label="Zoom out" disabled={zoomIdx === 0} onClick={() => setZoomIdx((z) => Math.max(z - 1, 0))} className="m-mono w-11 h-11 disabled:opacity-30">−</button>
        </div>

        {/* what's in focus */}
        {place && preview && (
          <Link to={`/travel/${place.slug}`} className="absolute hidden md:flex gap-3 p-2 border" style={{ right: 76, top: '12%', width: 240, borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 88%, transparent)' }}>
            {preview.latest && (
              <img src={thumbFor(preview.latest)} alt="" width="72" height="128" loading="lazy" className="block object-cover" style={{ width: preview.latest.format === 'short' ? 64 : 96, aspectRatio: preview.latest.format === 'short' ? '9 / 16' : '16 / 9' }} />
            )}
            <span className="flex flex-col gap-1 min-w-0">
              <span className="m-mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--m-rec)' }}>{focus ? '▸ IN FOCUS' : '▸ LATEST'}</span>
              <span className="font-semibold leading-tight" style={{ fontSize: 18 }}>{place.name}</span>
              <span className="m-mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--m-dim)' }}>
                {(preview.country?.name || '').toUpperCase()}{preview.country ? ' · ' : ''}{preview.count ? `${preview.count} ${preview.count === 1 ? 'STORY' : 'STORIES'}` : place.status === 'edit' ? 'IN THE EDIT' : 'COMING SOON'}
              </span>
              {preview.latest && <span className="text-xs leading-snug line-clamp-2 mt-auto" style={{ color: 'var(--m-dim)' }}>{preview.latest.title}</span>}
            </span>
          </Link>
        )}

        <span className="m-mono absolute left-4 hidden sm:flex items-center gap-4" style={{ bottom: '11%', fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-dim)' }}>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--m-rec)' }} />FILMED</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full border" style={{ borderColor: 'var(--m-rec)' }} />IN THE EDIT</span>
          <span>{totalCountries} COUNTRIES · {totalItems || '—'} STORIES</span>
        </span>
      </section>

      {/* look switch + trips timeline */}
      <section aria-label="Look and trips" className="flex flex-wrap gap-4 items-stretch">
        <div className="flex flex-col gap-2">
          <div role="group" aria-label="Look" className="m-mono flex border" style={{ borderColor: 'var(--m-line-2)', fontSize: 12, letterSpacing: '0.1em' }}>
            {[['LOG', true], ['GRADED', false]].map(([label, val]) => (
              <button
                key={label}
                type="button"
                aria-pressed={log === val}
                onClick={() => setLog(val)}
                className="min-h-[44px] px-4"
                style={log === val ? { background: 'var(--m-text)', color: 'var(--m-bg)' } : { color: 'var(--m-dim)' }}
              >
                {label}
              </button>
            ))}
          </div>
          {hasShop && <Link to="/shop" className="m-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--m-dim)' }}>GET THIS GRADE →</Link>}
        </div>

        <div className="flex-1 min-w-0 border" style={{ minWidth: 'min(100%, 560px)', borderColor: 'var(--m-line)', background: 'var(--m-panel)' }}>
          <div className="m-mono flex justify-between px-3 py-1.5" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--m-faint)', borderBottom: '1px solid var(--m-line)' }}>
            <span>V1 · TRIPS</span><span>{TRIPS[0]?.when?.toUpperCase()}</span><span>NOW</span>
          </div>
          <div className="flex overflow-x-auto p-2">
            {TRIPS.map((t) => {
              const target = findPlace(t.to);
              return (
                <Link
                  key={t.label}
                  to={`/travel/${t.to}`}
                  className={`m-clip ${t.status === 'edit' ? 'is-edit' : ''}`}
                  style={{ flex: `${Math.min(8, Math.max(2, cityCounts[t.to] || countryCounts[t.to] || 2))} 1 0`, ...(t.status === 'edit' ? {} : { background: t.color, color: t.ink || '#111' }) }}
                  onMouseEnter={() => target?.kind === 'city' && setFocus(t.to)}
                  onFocus={() => target?.kind === 'city' && setFocus(t.to)}
                  title={`${t.label} · ${t.when}`}
                >
                  {t.label.toUpperCase()}{t.status === 'edit' ? ' · IN THE EDIT' : ''}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* plain list of countries: for phones, keyboards and search engines */}
      <nav aria-label="Countries" className="m-mono flex flex-wrap gap-x-5 gap-y-2" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--m-dim)' }}>
        {COUNTRIES.map((c) => (
          <Link key={c.slug} to={`/travel/${c.slug}`} className="hover:opacity-70" style={{ color: countryCounts[c.slug] ? 'var(--m-text)' : 'var(--m-faint)' }}>
            {c.name.toUpperCase()} {countryCounts[c.slug] || (c.status === 'soon' ? '· SOON' : '')}
          </Link>
        ))}
      </nav>
      {videos.length === 0 && <p className="sr-only">Loading films…</p>}
    </div>
  );
}
