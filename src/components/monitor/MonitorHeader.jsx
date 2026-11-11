import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, ChevronDown, X } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useHasProducts, withoutShop } from '@/hooks/use-has-products';
import { COUNTRIES, citiesIn } from '@/lib/places';

const LINKS = [
  { label: 'Films', to: '/videos' },
  { label: 'Journal', to: '/journal' },
  { label: 'Work', to: '/portfolio' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
];

const FILMED = COUNTRIES.filter((c) => c.status !== 'soon');

function SearchBox({ className = '', autoFocus = false, onDone }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const v = q.trim();
    navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
    setQ('');
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className={`sn-search ${className}`}>
      <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search places, films, stories"
        aria-label="Search the site"
        autoFocus={autoFocus}
      />
    </form>
  );
}

/** "Places" menu: every country filmed, with its cities. */
function PlacesMenu({ onDone }) {
  return (
    <div className="sn-places">
      {FILMED.map((c) => (
        <div key={c.slug}>
          <Link to={`/travel/${c.slug}`} onClick={onDone} className="sn-places-country">{c.name}</Link>
          <ul>
            {citiesIn(c.slug).map((p) => (
              <li key={p.slug}><Link to={`/travel/${p.slug}`} onClick={onDone}>{p.name}</Link></li>
            ))}
          </ul>
        </div>
      ))}
      <Link to="/" onClick={onDone} className="sn-places-all">See them all on the globe →</Link>
    </div>
  );
}

/** Site header for every jooonbon page. */
export default function MonitorHeader() {
  const { isDark, toggle } = useTheme();
  const { pathname } = useLocation();
  const links = withoutShop(LINKS, useHasProducts());
  const [sheet, setSheet] = useState(false);
  const [places, setPlaces] = useState(false);
  const placesRef = useRef(null);

  useEffect(() => { setSheet(false); setPlaces(false); }, [pathname]);
  useEffect(() => {
    if (!places) return undefined;
    const close = (e) => { if (!placesRef.current?.contains(e.target)) setPlaces(false); };
    const esc = (e) => { if (e.key === 'Escape') setPlaces(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [places]);
  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheet]);

  const isActive = (to) => pathname.startsWith(to);
  const onPlaces = pathname === '/' || pathname.startsWith('/travel/');

  return (
    <header className="sn">
      <div className="sn-bar">
        <Link to="/" aria-label="jooonbon home" className="shrink-0">
          <img src="/logo.png" alt="jooonbon" width="1037" height="474" className="m-logo block h-8 md:h-9 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden xl:flex items-center gap-1 ml-6">
          <div ref={placesRef} className="relative">
            <button type="button" className={`sn-link ${onPlaces ? 'is-active' : ''}`} aria-expanded={places} aria-haspopup="true" onClick={() => setPlaces((o) => !o)}>
              Places <ChevronDown className={`w-3.5 h-3.5 transition-transform ${places ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {places && (
              <div className="sn-pop">
                <PlacesMenu onDone={() => setPlaces(false)} />
              </div>
            )}
          </div>
          {links.map((l) => (
            <Link key={l.to} to={l.to} aria-current={isActive(l.to) ? 'page' : undefined} className={`sn-link ${isActive(l.to) ? 'is-active' : ''}`}>
              {l.label}
            </Link>
          ))}
          <Link to="/bonpoints" className="sn-link">
            bon.points <span className="sn-badge">Finance</span>
          </Link>
        </nav>

        <SearchBox className="hidden md:flex flex-1 mx-4 xl:mx-6" />

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <Link to="/search" aria-label="Search" className="sn-icon md:hidden"><Search className="w-4 h-4" /></Link>
          <button type="button" onClick={toggle} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} className="sn-icon">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <a href="https://youtube.com/jonbontabas" target="_blank" rel="noopener noreferrer" className="sn-btn is-ghost hidden lg:inline-flex">YouTube ↗</a>
          <Link to="/contact" className="sn-btn is-solid hidden sm:inline-flex">Work with me</Link>
          <button type="button" onClick={() => setSheet(true)} aria-expanded={sheet} aria-label="Menu" className="sn-icon xl:hidden">
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path d="M1 1H17M1 6H17M1 11H17" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
      </div>

      {sheet && (
        <div className="sn-sheet xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="sn-bar">
            <Link to="/" aria-label="jooonbon home"><img src="/logo.png" alt="jooonbon" width="1037" height="474" className="m-logo block h-8 w-auto" /></Link>
            <button type="button" onClick={() => setSheet(false)} aria-label="Close menu" className="sn-icon ml-auto"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-4 pb-10 overflow-y-auto">
            <SearchBox className="flex md:hidden mb-6" onDone={() => setSheet(false)} />
            <nav aria-label="Main" className="flex flex-col">
              <Link to="/" className="sn-sheet-link">Map</Link>
              {links.map((l) => <Link key={l.to} to={l.to} className="sn-sheet-link">{l.label}</Link>)}
              <Link to="/bonpoints" className="sn-sheet-link">bon.points <span className="sn-badge">Finance</span></Link>
            </nav>
            <p className="mt-8 mb-3 text-sm" style={{ color: 'var(--m-faint)' }}>Places</p>
            <PlacesMenu onDone={() => setSheet(false)} />
            <div className="flex gap-2 mt-8">
              <Link to="/contact" className="sn-btn is-solid flex-1 justify-center">Work with me</Link>
              <a href="https://youtube.com/jonbontabas" target="_blank" rel="noopener noreferrer" className="sn-btn is-ghost flex-1 justify-center">YouTube ↗</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
