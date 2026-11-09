import React from 'react';
import { Link } from 'react-router-dom';
import { BRANDS } from '@/lib/brands';
import { BonpointsWordmark } from '@/components/shared/BrandDoor';

const links = [
  { label: 'Guides', to: '/bonpoints/guides' },
  { label: 'Videos', to: '/bonpoints/videos' },
  { label: 'Newsletter', to: '/bonpoints#newsletter' },
  { label: 'Disclosures', to: '/disclosures' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

const linkCls = 'font-sans text-sm text-muted-foreground hover:text-foreground transition-colors';

export default function BonpointsFooter() {
  const b = BRANDS.bonpoints;
  return (
    <footer className="px-6 md:px-16 py-16 md:py-24 border-t border-border">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-5">
          <Link to="/bonpoints" className="text-3xl text-foreground">
            <BonpointsWordmark />
          </Link>
          <p className="font-sans text-sm text-muted-foreground mt-tk-5 max-w-sm leading-relaxed">
            {b.tagline}. Educational content, not financial advice.
          </p>
          <div className="flex items-center gap-6 mt-tk-6">
            <a href={b.youtube} target="_blank" rel="noopener noreferrer" className={linkCls}>YouTube</a>
            <a href={b.instagram} target="_blank" rel="noopener noreferrer" className={linkCls}>Instagram</a>
          </div>
        </div>

        <nav aria-label="bon.points" className="md:col-span-4">
          <ul className="grid grid-cols-2 gap-y-3 gap-x-8">
            {links.map((l) => (
              <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground mb-tk-4">Also by Jon</p>
          <Link to="/" className="bp-glass inline-block rounded-tk-pill px-tk-5 py-tk-3 font-sans text-sm text-foreground hover:opacity-70 transition-opacity">
            jooonbon, travel films →
          </Link>
        </div>
      </div>

      <p className="max-w-6xl mx-auto mt-16 font-sans text-xs text-muted-foreground">
        © {new Date().getFullYear()} Jon Bon Tabas. All rights reserved.
      </p>
    </footer>
  );
}
