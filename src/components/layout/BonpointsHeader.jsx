import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';

// Header for everything under /bonpoints. Awwwards-style layout: ticker strip,
// then menu + logo, a wide search field, text links and two pill buttons.
// bon.points v2 colours (Ink/Graphite/Bone), Inter.
const links = [
  { label: 'Guides', to: '/bonpoints/guides' },
  { label: 'Videos', to: '/bonpoints/videos' },
];

const TICKER = [
  { text: 'Credit cards, points and money for Canadians', to: '/bonpoints' },
  { text: 'Get bon.points by email', to: '/bonpoints#newsletter' },
  { text: 'Educational content, not financial advice', to: '/disclosures' },
];

const isActive = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

function Ticker() {
  const row = [...TICKER, ...TICKER, ...TICKER, ...TICKER];
  return (
    <div className="h-8 overflow-hidden bg-[var(--bp-bone)] text-[var(--bp-ink)]" aria-label="Announcements">
      <div className="flex h-full w-max items-center animate-jb-marquee motion-reduce:animate-none">
        {row.map((t, i) => (
          <Link
            key={i}
            to={t.to}
            tabIndex={i >= TICKER.length ? -1 : undefined}
            aria-hidden={i >= TICKER.length}
            className="flex items-center gap-tk-6 px-tk-6 font-sans text-[13px] whitespace-nowrap hover:underline"
          >
            <span className={i % TICKER.length === 1 ? 'font-semibold' : ''}>{t.text}</span>
            <img src="/brands/bonpoints/mark-bone.svg" alt="" className="h-3.5 w-auto invert" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchField({ className = '', autoFocus = false, onDone }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        navigate(`/search?q=${encodeURIComponent(v)}`);
        onDone?.();
      }}
    >
      <label className="flex items-center gap-tk-3 h-11 rounded-xl bg-[var(--bp-graphite)] border border-[var(--bp-ash)] px-tk-5 focus-within:border-[var(--bp-smoke)] transition-colors duration-fast">
        <Search className="w-4 h-4 shrink-0 text-[var(--bp-smoke)]" aria-hidden="true" />
        <span className="sr-only">Search bon.points</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder="Search cards, points, guides"
          className="w-full bg-transparent font-sans text-[15px] text-[var(--bp-bone)] placeholder:text-[var(--bp-smoke)] outline-none"
        />
      </label>
    </form>
  );
}

const pill = 'inline-flex items-center h-11 px-tk-6 rounded-xl font-sans text-[15px] font-medium transition-colors duration-fast';
const pillFill = `${pill} bg-[var(--bp-bone)] text-[var(--bp-ink)] hover:bg-[var(--bp-stone)]`;
const pillLine = `${pill} border border-[var(--bp-bone)]/80 text-[var(--bp-bone)] hover:bg-white/10`;

export default function BonpointsHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setIsOpen(false), [location]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <Ticker />
        <div className="bg-[var(--bp-ink)]/90 backdrop-blur-md border-b border-[var(--bp-ash)]">
          <nav className="flex items-center gap-tk-5 md:gap-tk-8 px-tk-5 md:px-tk-8 h-[72px]">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              className="shrink-0 text-[var(--bp-bone)] relative z-50 hover:opacity-70"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link to="/bonpoints" className="shrink-0 relative z-50" aria-label="bon.points home">
              <img src="/brands/bonpoints/lockup-bone.svg" alt="bonpoints" className="h-6 md:h-7 w-auto" />
            </Link>

            <SearchField className="hidden md:block flex-1 max-w-2xl" />

            <div className="ml-auto flex items-center gap-tk-6">
              {links.map((l) => {
                const active = isActive(location.pathname, l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    aria-current={active ? 'page' : undefined}
                    className={`hidden lg:inline font-sans text-[15px] font-medium transition-opacity duration-fast hover:opacity-60 ${
                      active ? 'text-[var(--bp-bone)] underline underline-offset-8' : 'text-[var(--bp-bone)]'
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <Link to="/bonpoints#newsletter" className={pillFill}>Newsletter</Link>
              <Link to="/" className={`hidden md:inline-flex ${pillLine}`}>jooonbon</Link>
            </div>
          </nav>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--bp-ink)] pt-[136px] px-tk-6 md:px-tk-8">
          <SearchField className="md:hidden mb-10" autoFocus onDone={() => setIsOpen(false)} />
          <div className="flex flex-col gap-tk-6">
            {[{ label: 'Home', to: '/bonpoints' }, ...links, { label: 'Newsletter', to: '/bonpoints#newsletter' }].map((l) => (
              <Link key={l.to} to={l.to} className="font-sans text-4xl md:text-6xl font-semibold tracking-[-0.03em] text-[var(--bp-bone)] hover:opacity-60">
                {l.label}
              </Link>
            ))}
            <Link to="/" className={`self-start mt-tk-6 ${pillLine}`}>← jooonbon, travel films</Link>
          </div>
        </div>
      )}
    </>
  );
}
