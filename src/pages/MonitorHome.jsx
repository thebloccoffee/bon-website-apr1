import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GlobeMap from '@/components/monitor/GlobeMap';
import { useMapContent } from '@/components/monitor/useMapContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { COUNTRIES, findPlace, itemsFor, countryOf, citiesIn } from '@/lib/places';
import '@/components/monitor/monitor.css';

const storyCount = (n) => `${n} ${n === 1 ? 'story' : 'stories'}`;

// Home: the globe is the hero. The site header sits over it, the title and
// counts sit bottom-left, the hint bottom-right. Every place is listed below.
export default function MonitorHome() {
  const { all, countryCounts, cityCounts, latestCity } = useMapContent();
  const phone = useIsMobile();

  const [hover, setHover] = useState(null);
  const [sel, setSel] = useState(null); // { slug } of a city or country, or { name } of a country with nothing yet
  const [zoom, setZoom] = useState(1);
  const [flyTo, setFlyTo] = useState(null);
  const flyN = useRef(0);

  const fly = useCallback((target) => { flyN.current += 1; setFlyTo({ ...target, n: flyN.current }); }, []);

  // Phones open spun to the latest place.
  useEffect(() => {
    if (phone && latestCity) fly({ slug: latestCity });
  }, [phone, latestCity, fly]);

  const select = useCallback((slug) => {
    const place = findPlace(slug);
    if (!place) return;
    setSel({ slug });
    fly({ slug });
    setZoom((cur) => Math.max(cur, place.kind === 'country' ? 1.6 : 2.2));
  }, [fly]);

  const onCountry = useCallback((slug, name) => setSel(slug ? { slug } : { name }), []);
  const reset = () => { setSel(null); setZoom(1); fly({ world: true }); };

  const activeSlug = sel?.slug || hover;
  const place = activeSlug ? findPlace(activeSlug) : null;
  const count = useMemo(() => (place ? itemsFor(place, all).length : 0), [place, all]);
  const focusCity = place?.kind === 'city' ? place.slug : null;
  const zoomed = zoom > 1.01 || Boolean(sel);

  // The one line under the globe: a hint, or what you're pointing at.
  let line;
  if (sel?.name) {
    line = <span>{sel.name} · not filmed yet</span>;
  } else if (place) {
    const where = place.kind === 'city' ? countryOf(place.country)?.name : `${citiesIn(place.slug).length} places`;
    const status = count ? storyCount(count) : place.status === 'edit' ? 'in the edit' : 'coming soon';
    line = (
      <Link to={`/travel/${place.slug}`} className="pointer-events-auto hover:opacity-70">
        <span style={{ color: 'var(--m-text)', fontWeight: 600 }}>{place.name}</span> · {where} · {status} <span aria-hidden="true">→</span>
      </Link>
    );
  } else {
    line = <span>Drag to spin · tap a city</span>;
  }

  const listed = COUNTRIES.filter((c) => countryCounts[c.slug] || citiesIn(c.slug).some((p) => p.status === 'edit'));

  return (
    <div className="monitor">
      <section aria-label="Globe" className="relative overflow-hidden" style={{ height: '100svh', minHeight: phone ? 600 : 640 }}>
        <GlobeMap
          focus={focusCity}
          onFocus={phone ? undefined : setHover}
          onPin={select}
          onCountry={onCountry}
          counts={countryCounts}
          cityCounts={cityCounts}
          flyTo={flyTo}
          zoom={zoom}
          onZoom={setZoom}
          spin={!sel && !hover}
          compact={phone}
          radius={phone ? 0.24 : 0.27}
        />

        <div aria-hidden="true" className="m-grain" />

        {/* bottom-left: title and counts */}
        <div className="absolute left-6 md:left-16 bottom-6 md:bottom-10 max-w-[60%] pointer-events-none">
          <h1 className="font-semibold tracking-tight leading-none" style={{ fontSize: 'clamp(24px, 3.4vw, 44px)' }}>Every place I've filmed.</h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--m-dim)' }}>
            {Object.keys(countryCounts).length} countries · {Object.keys(cityCounts).length} places · {all.length} stories
          </p>
        </div>

        {/* bottom-right: hint, or what you're pointing at */}
        <div className="absolute right-6 md:right-16 bottom-6 md:bottom-10 flex flex-col items-end gap-2 pointer-events-none text-right max-w-[45%] md:max-w-[40%]">
          <p className="text-sm" style={{ color: 'var(--m-dim)' }} aria-live="polite">{line}</p>
          {zoomed && (
            <button type="button" onClick={reset} className="pointer-events-auto text-sm underline underline-offset-4 min-h-[36px] hover:opacity-70" style={{ color: 'var(--m-faint)' }}>
              ← Whole world
            </button>
          )}
        </div>
      </section>

      {/* every place, in plain text */}
      <section aria-labelledby="places" className="px-6 md:px-16 py-20">
        <h2 id="places" className="text-2xl mb-8">Places</h2>
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {listed.map((c) => (
            <div key={c.slug}>
              <Link to={`/travel/${c.slug}`} className="flex justify-between items-baseline pb-2 hover:opacity-70" style={{ borderBottom: '1px solid var(--m-line)' }}>
                <span className="font-medium">{c.name}</span>
                <span className="m-mono" style={{ fontSize: 11, color: 'var(--m-faint)' }}>{countryCounts[c.slug] || ''}</span>
              </Link>
              <ul className="mt-2">
                {citiesIn(c.slug).filter((p) => cityCounts[p.slug] || p.status === 'edit').map((p) => (
                  <li key={p.slug}>
                    <Link to={`/travel/${p.slug}`} className="flex justify-between py-1.5 text-sm hover:opacity-70" style={{ color: 'var(--m-dim)' }}>
                      <span>{p.name}</span>
                      <span className="m-mono" style={{ fontSize: 11, color: 'var(--m-faint)' }}>{cityCounts[p.slug] || 'in the edit'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
