import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useHasProducts, withoutShop } from '@/hooks/use-has-products';

const LINKS = [
  { label: 'Map', to: '/' },
  { label: 'Films', to: '/videos' },
  { label: 'Journal', to: '/journal' },
  { label: 'Work', to: '/portfolio' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
];

// Running timecode since the page opened, 24 fps. Writes straight to the DOM
// so it never re-renders React.
function Timecode() {
  const ref = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const ms = performance.now() - start;
      const s = Math.floor(ms / 1000);
      if (ref.current) {
        ref.current.textContent = `TC ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(Math.floor((ms % 1000) / (1000 / 24)))}`;
      }
    };
    tick();
    const id = setInterval(tick, 84);
    return () => clearInterval(id);
  }, []);
  return <span ref={ref} aria-hidden="true">TC 00:00:00:00</span>;
}

function VancouverClock() {
  const fmt = () =>
    new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Vancouver' }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 30000);
    return () => clearInterval(id);
  }, []);
  return <span>VANCOUVER {t}</span>;
}

/** Camera-monitor header used by the map homepage and place pages. */
export default function MonitorHeader({ profile }) {
  const { isDark, toggle } = useTheme();
  const { pathname } = useLocation();
  const links = withoutShop(LINKS, useHasProducts());
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="m-mono" style={{ fontSize: 12, letterSpacing: '0.08em' }}>
      <div className="grid items-center gap-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--m-rec)' }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'var(--m-rec)' }} />REC
          </span>
          <span className="hidden sm:inline"><Timecode /></span>
        </div>
        <Link to="/" aria-label="jooonbon home">
          <img src="/logo.png" alt="jooonbon" width="1037" height="474" className="m-logo block h-9 md:h-11 w-auto" />
        </Link>
        <div className="flex items-center justify-end gap-5">
          <nav aria-label="Main" className="hidden lg:flex items-center gap-5">
            {links.map((l) => {
              const active = l.to === '/' ? pathname === '/' || pathname.startsWith('/travel/') : pathname.startsWith(l.to);
              return (
                <Link key={l.to} to={l.to} aria-current={active ? 'page' : undefined} style={active ? { color: 'var(--m-rec)' } : undefined} className="uppercase hover:opacity-70">
                  {l.label}
                </Link>
              );
            })}
            <Link to="/bonpoints" className="uppercase hover:opacity-70" style={{ color: 'var(--m-dim)' }}>bon.points ↗</Link>
          </nav>
          <button type="button" onClick={toggle} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} className="w-11 h-11 flex items-center justify-center border" style={{ borderColor: 'var(--m-line-2)' }}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="lg:hidden w-11 h-11 flex items-center justify-center border" style={{ borderColor: 'var(--m-line-2)' }}>
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path d="M1 1H17M1 6H17M1 11H17" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Main" className="lg:hidden flex flex-col border-t border-b mt-3" style={{ borderColor: 'var(--m-line)' }}>
          {[...links, { label: 'bon.points ↗', to: '/bonpoints' }].map((l) => (
            <Link key={l.to} to={l.to} className="uppercase py-3" style={{ borderBottom: '1px solid var(--m-line)' }}>{l.label}</Link>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap justify-between gap-3 mt-2" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--m-dim)' }}>
        <span className="hidden sm:inline">4K · 23.98P · 180°</span>
        <VancouverClock />
        {profile && <span style={{ color: 'var(--m-text)' }}>{profile}</span>}
      </div>
    </header>
  );
}
