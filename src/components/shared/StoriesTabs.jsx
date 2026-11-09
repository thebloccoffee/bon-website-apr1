import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// One "Stories" tab in the nav; these are its filters. Each keeps its own URL
// (/videos, /journal, /travel) so old links and Google results still land.
export const STORIES_TABS = [
  { label: 'All', to: '/stories' },
  { label: 'Films', to: '/videos' },
  { label: 'Journal', to: '/journal' },
  { label: 'Destinations', to: '/travel' },
];

export const STORIES_PATHS = STORIES_TABS.map((t) => t.to);

export default function StoriesTabs({ className = '' }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Stories" className={`px-6 md:px-16 mb-10 md:mb-12 ${className}`}>
      <div className="flex gap-tk-2 overflow-x-auto -mx-1 px-1 pb-1">
        {STORIES_TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 font-sans text-tk-sm uppercase tracking-[0.15em] px-tk-4 py-tk-3 border transition-colors duration-fast ${
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
