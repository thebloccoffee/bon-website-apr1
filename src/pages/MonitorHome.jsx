import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import GlobeMap from '@/components/monitor/GlobeMap';
import { cleanTitle } from '@/components/monitor/FocusCard';
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

  // Hover a city on desktop: after a short pause, turn the globe to it and zoom in.
  useEffect(() => {
    if (phone || !hover || sel) return undefined;
    const t = setTimeout(() => { fly({ slug: hover }); setZoom((z) => Math.max(z, 1.3)); }, 280);
    return () => clearTimeout(t);
  }, [hover, sel, phone, fly]);
  // Leaving the globe closes the preview after a beat, so the mouse can reach the card.
  const leaveTimer = useRef(0);
  const leaveGlobe = useCallback(() => {
    if (sel) return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => { setHover(null); setZoom(1); }, 450);
  }, [sel]);
  const holdPreview = () => clearTimeout(leaveTimer.current);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // Preview card: the place's latest film.
  const latest = useMemo(() => {
    if (!place) return null;
    const vids = itemsFor(place, all).filter((i) => i._type === 'video' && i.youtube_id);
    return vids.find((x) => x.format !== 'short') || vids[0] || null;
  }, [place, all]);
  const focusCity = place?.kind === 'city' ? place.slug : null;
  const zoomed = zoom > 1.01 || Boolean(sel);

  // The one line under the globe: a hint, or what you're pointing at.
  let line;
  if (sel?.name) {
    line = <span>{sel.name} · not filmed yet</span>;
  } else if (place && phone) {
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
          onFocus={phone ? undefined : (slug) => { holdPreview(); setHover(slug); }}
          onLeave={phone ? undefined : leaveGlobe}
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

        {/* preview: top-right on desktop, under the header on phones */}
        <AnimatePresence mode="wait">
          {place && !sel?.name && (
            <motion.div
              key={place.slug}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-10 right-6 md:right-16 top-[88px] md:top-[104px] w-[min(320px,calc(100%-48px))]"
              onMouseEnter={holdPreview}
              onMouseLeave={leaveGlobe}
            >
              <Link to={`/travel/${place.slug}`} className="block group p-3 border" style={{ background: 'color-mix(in srgb, var(--m-bg) 90%, transparent)', borderColor: 'var(--m-line)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 0 }}>
                {latest ? (
                  <span className="film-frame block aspect-video overflow-hidden" style={{ background: 'var(--m-panel)' }}>
                    <img
                      src={`https://i.ytimg.com/vi/${latest.youtube_id}/${latest.format === 'short' ? 'hqdefault' : 'mqdefault'}.jpg`}
                      alt=""
                      className="block w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ objectFit: 'cover' }}
                    />
                  </span>
                ) : (
                  <span className="film-frame flex items-center justify-center aspect-video text-sm" style={{ background: 'var(--m-panel)', color: 'var(--m-faint)' }}>
                    {place.status === 'edit' ? 'In the edit' : 'Coming soon'}
                  </span>
                )}
                <span className="flex items-baseline justify-between gap-3 mt-3">
                  <span className="text-lg font-semibold tracking-tight">{place.name}</span>
                  <span className="text-sm shrink-0" style={{ color: 'var(--m-dim)' }}>Open →</span>
                </span>
                <span className="block text-sm mt-0.5" style={{ color: 'var(--m-dim)' }}>
                  {place.kind === 'city' ? countryOf(place.country)?.name : `${citiesIn(place.slug).length} places`} · {count ? storyCount(count) : place.status === 'edit' ? 'in the edit' : 'coming soon'}
                </span>
                {latest && <span className="block text-sm mt-2 line-clamp-1" style={{ color: 'var(--m-faint)' }}>Latest: {cleanTitle(latest.title)}</span>}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

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
