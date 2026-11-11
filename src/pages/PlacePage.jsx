import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import WorldMap from '@/components/monitor/WorldMap';
import { useMapContent, thumbFor, watchUrl, postUrl } from '@/components/monitor/useMapContent';
import Seo from '@/components/shared/Seo';
import { countryOf, citiesIn, itemsFor, project, MAP_W, MAP_H } from '@/lib/places';
import '@/components/monitor/monitor.css';

const fmtCoord = (lat, lng) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'long', label: 'Films' },
  { key: 'short', label: 'Shorts' },
  { key: 'post', label: 'Journal' },
];

/** /travel/:slug for a city or country on the map. `place` comes from findPlace(). */
export default function PlacePage({ place }) {
  const { all, cityCounts, countryCounts, isLoading } = useMapContent();
  const [tab, setTab] = useState('all');

  const isCountry = place.kind === 'country';
  const country = isCountry ? place : countryOf(place.country);
  const cities = citiesIn(country?.slug);
  const focusCity = isCountry ? cities[0]?.slug : place.slug;

  const items = useMemo(() => itemsFor(place, all), [place, all]);
  const counts = useMemo(() => ({
    long: items.filter((i) => i._type === 'video' && i.format !== 'short').length,
    short: items.filter((i) => i._type === 'video' && i.format === 'short').length,
    post: items.filter((i) => i._type === 'post').length,
  }), [items]);
  const shown = useMemo(() => {
    if (tab === 'all') return items;
    if (tab === 'post') return items.filter((i) => i._type === 'post');
    return items.filter((i) => i._type === 'video' && (tab === 'short' ? i.format === 'short' : i.format !== 'short'));
  }, [items, tab]);

  // Zoom the small map onto this country's cities.
  const { zoom, center } = useMemo(() => {
    if (!cities.length) return { zoom: 1, center: undefined };
    const pts = cities.map((c) => project(c.lat, c.lng));
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * (MAP_W / MAP_H), 20);
    return {
      zoom: Math.max(1.5, Math.min(6, Math.round((MAP_W / (span * 2.4)) * 2) / 2)),
      center: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2],
    };
  }, [cities]);

  const status = place.status || (isCountry && !countryCounts[place.slug] ? 'soon' : 'filmed');
  const title = isCountry ? place.name : place.name;
  const where = isCountry ? 'country' : country?.name;

  return (
    <div className="monitor min-h-screen">
      <Seo
        title={`${title}: films and travel notes`}
        description={`Travel films, shorts and notes from ${title}${!isCountry && country ? `, ${country.name}` : ''} by Jon Bon Tabas.`}
      />
      <div className="px-6 md:px-16 pt-28 pb-24">

        <nav aria-label="Breadcrumb" className="mt-6 text-sm" style={{ color: 'var(--m-faint)' }}>
          <Link to="/" className="hover:underline underline-offset-4">World</Link>
          {!isCountry && country && <> / <Link to={`/travel/${country.slug}`} className="hover:underline underline-offset-4">{country.name}</Link></>}
          {' / '}<span style={{ color: 'var(--m-text)' }}>{title}</span>
        </nav>

        <section className="flex flex-wrap gap-10 pt-6 pb-12 items-stretch">
          <div className="flex-[999_1_480px] min-w-0 flex flex-col">
            <p className="text-sm" style={{ color: 'var(--m-dim)' }}>
              {!isCountry && `${fmtCoord(place.lat, place.lng)} · `}{where === 'country' ? 'Country' : where}
              {status === 'edit' && <span style={{ color: 'var(--m-rec)' }}> · ● In the edit</span>}
              {status === 'soon' && <span> · Coming soon</span>}
            </p>
            <h1 className="font-bold mt-3 break-words" style={{ fontSize: 'clamp(64px, 11vw, 150px)', lineHeight: 0.9, letterSpacing: '-0.04em' }}>{title}</h1>
            <dl className="flex flex-wrap gap-9 mt-auto pt-8 text-sm">
              {[['Films', counts.long], ['Shorts', counts.short], ['Journal', counts.post]].map(([k, n]) => (
                <div key={k}>
                  <dt style={{ color: 'var(--m-faint)' }}>{k}</dt>
                  <dd className="font-semibold mt-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 38, letterSpacing: '-0.02em', color: n ? 'var(--m-text)' : 'var(--m-faint)' }}>{isLoading ? '–' : n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="relative flex-[1_1_300px] max-w-[440px] m-0 border overflow-hidden rounded-xl" style={{ borderColor: 'var(--m-line)', background: 'var(--m-ocean)' }}>
            <WorldMap focus={focusCity} counts={countryCounts} view={center ? { k: zoom, cx: center[0], cy: center[1] } : undefined} showLabels={false} />
          </figure>
        </section>

        {isCountry && cities.length > 0 && (
          <section aria-labelledby="cities" className="pb-10">
            <h2 id="cities" className="text-xl mb-3">Places in {title}</h2>
            <ul>
              {cities.map((c) => (
                <li key={c.slug} className="flex justify-between py-3.5" style={{ borderBottom: '1px solid var(--m-line)' }}>
                  <Link to={`/travel/${c.slug}`} className="hover:opacity-70">{c.name}</Link>
                  <span className="text-sm" style={{ color: c.status === 'edit' ? 'var(--m-rec)' : 'var(--m-faint)' }}>
                    {cityCounts[c.slug] ? `${cityCounts[c.slug]} ${cityCounts[c.slug] === 1 ? 'story' : 'stories'}` : c.status === 'edit' ? '● In the edit' : 'Soon'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label="Filter" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const n = t.key === 'all' ? items.length : counts[t.key];
            return (
              <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)} className={`ui-chip ${tab === t.key ? 'is-active' : ''}`}
                style={tab !== t.key && !n ? { color: 'var(--m-faint)' } : undefined}>
                {t.label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </nav>

        <section aria-live="polite" className="pt-8">
          {!isLoading && shown.length === 0 ? (
            <p className="py-16 text-center" style={{ color: 'var(--m-dim)' }}>
              {status === 'edit' ? `${title} is in the edit. Films land here as soon as they're out.` : `Nothing from ${title} here yet.`}
            </p>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {shown.map((it, i) =>
                it._type === 'video' ? (
                  <a key={`v${it.youtube_id}`} href={watchUrl(it)} target="_blank" rel="noopener noreferrer" className="block group" aria-label={`Watch on YouTube: ${it.title}`}>
                    <span className="film-frame relative block overflow-hidden" style={{ background: 'var(--m-panel)' }}>
                      <img src={thumbFor(it)} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" width="480" height={it.format === 'short' ? 853 : 270} className="block w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" style={{ aspectRatio: it.format === 'short' ? '9 / 16' : '16 / 9' }} />
                      <span className="absolute left-2.5 top-2.5 px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'color-mix(in srgb, var(--m-bg) 85%, transparent)' }}>
                        {it.format === 'short' ? 'Short' : 'Film'}
                      </span>
                    </span>
                    <span className="block mt-2.5 text-[15px] leading-snug">{it.title}</span>
                  </a>
                ) : (
                  <Link key={`p${it.slug}`} to={postUrl(it)} className="block group">
                    <span className="relative block overflow-hidden" style={{ background: 'var(--m-panel)' }}>
                      {it.cover_image && <img src={it.cover_image} alt="" loading="lazy" decoding="async" width="480" height="270" className="block w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" style={{ aspectRatio: '16 / 9' }} />}
                      <span className="m-mono absolute left-2 top-2 px-1.5 py-0.5" style={{ fontSize: 10, letterSpacing: '0.1em', background: 'color-mix(in srgb, var(--m-bg) 85%, transparent)' }}>JOURNAL</span>
                    </span>
                    <span className="block mt-2.5 text-[15px] leading-snug">{it.title}</span>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        {!isCountry && cities.length > 1 && (
          <section aria-labelledby="more" className="mt-16 pt-7" style={{ borderTop: '1px solid var(--m-line)' }}>
            <h2 id="more" className="font-semibold text-3xl tracking-tight">More in {country.name}</h2>
            <ul className="mt-4">
              {cities.filter((c) => c.slug !== place.slug).map((c) => (
                <li key={c.slug} className="flex justify-between py-3.5" style={{ borderBottom: '1px solid var(--m-line)' }}>
                  <Link to={`/travel/${c.slug}`} className="hover:opacity-70">{c.name}</Link>
                  <span className="text-sm" style={{ color: c.status === 'edit' ? 'var(--m-rec)' : 'var(--m-faint)' }}>
                    {cityCounts[c.slug] ? `${cityCounts[c.slug]} ${cityCounts[c.slug] === 1 ? 'story' : 'stories'}` : c.status === 'edit' ? '● In the edit' : 'Soon'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
