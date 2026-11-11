import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import GlobeMap from '@/components/monitor/GlobeMap';
import { useMapContent } from '@/components/monitor/useMapContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/use-theme';
import { useHasProducts, withoutShop } from '@/hooks/use-has-products';
import { COUNTRIES, findPlace, itemsFor, countryOf, citiesIn } from '@/lib/places';
import '@/components/monitor/monitor.css';

const NAV = [
  { label: 'Map', to: '/' },
  { label: 'Films', to: '/videos' },
  { label: 'Journal', to: '/journal' },
  { label: 'Work', to: '/portfolio' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
];

const storyCount = (n) => `${n} ${n === 1 ? 'story' : 'stories'}`;

// Home: one quiet screen. Logo on top, the globe in the middle, a line of
// text under it and the menu at the bottom. Every place is listed below.
export default function MonitorHome() {
  const { all, countryCounts, cityCounts, latestCity } = useMapContent();
  const phone = useIsMobile();
  const { isDark, toggle } = useTheme();
  const nav = withoutShop(NAV, useHasProducts());

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
        <span style={{ color: 'var(--m-text)' }}>{place.name}</span> · {where} · {status} <span aria-hidden="true">→</span>
      </Link>
    );
  } else {
    line = <span>Pick a city to start</span>;
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
          flyTo={flyTo}
          zoom={zoom}
          onZoom={setZoom}
          spin={!sel && !hover}
          compact={phone}
          radius={phone ? 0.2 : 0.23}
          band={phone ? [0.2, 0.52] : [0.18, 0.56]}
        />

        {/* top: logo | one line */}
        <header className="absolute inset-x-0 top-0 flex items-center justify-center gap-4 pt-7 md:pt-10 pointer-events-none">
          <Link to="/" aria-label="jooonbon home" className="pointer-events-auto">
            <img src="/logo.png" alt="jooonbon" width="1037" height="474" className="m-logo block h-9 md:h-12 w-auto" />
          </Link>
          <span aria-hidden="true" className="h-7 w-px" style={{ background: 'var(--m-line-2)' }} />
          <h1 className="text-sm md:text-base font-normal tracking-wide" style={{ color: 'var(--m-dim)' }}>Every place I've filmed</h1>
        </header>

        {/* under the globe */}
        <div className="absolute inset-x-0 flex flex-col items-center gap-3 px-4 pointer-events-none" style={{ top: phone ? '74%' : '77%' }}>
          <p className="m-mono uppercase text-center" style={{ fontSize: phone ? 11 : 12, letterSpacing: '0.2em', color: 'var(--m-dim)' }} aria-live="polite">
            {line}
          </p>
          {zoomed && (
            <button type="button" onClick={reset} className="m-mono pointer-events-auto uppercase min-h-[40px] px-3 hover:opacity-70" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--m-faint)' }}>
              ← Whole world
            </button>
          )}
        </div>

        {/* bottom: menu, then small icons */}
        <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-5 md:pb-7">
          <nav aria-label="Main" className="m-mono flex items-center gap-5 md:gap-9 uppercase overflow-x-auto max-w-full px-4" style={{ fontSize: phone ? 10 : 11, letterSpacing: '0.2em' }}>
            {nav.map((l) => (
              <Link key={l.to} to={l.to} aria-current={l.to === '/' ? 'page' : undefined} className="shrink-0 py-2 hover:opacity-70" style={{ color: l.to === '/' ? 'var(--m-text)' : 'var(--m-faint)' }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-6 m-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--m-faint)' }}>
            <button type="button" onClick={toggle} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} className="w-9 h-9 flex items-center justify-center hover:opacity-70">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a href="https://youtube.com/jonbontabas" target="_blank" rel="noopener noreferrer" className="py-2 hover:opacity-70">YouTube ↗</a>
            <Link to="/bonpoints" className="py-2 hover:opacity-70">bon.points ↗</Link>
          </div>
        </footer>
      </section>

      {/* every place, in plain text */}
      <section aria-labelledby="places" className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <h2 id="places" className="m-mono uppercase text-center mb-8" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--m-faint)' }}>Places</h2>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
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
