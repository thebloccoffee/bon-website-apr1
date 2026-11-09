import React from 'react';
import { Link } from 'react-router-dom';
import { BRANDS } from '@/lib/brands';
import NewsletterForm from '@/components/shared/NewsletterForm';

const siteLinks = [
  { label: 'Work', to: '/portfolio' },
  { label: 'Films', to: '/videos' },
  { label: 'Destinations', to: '/travel' },
  { label: 'Journal', to: '/journal' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
  { label: 'Book me', to: '/contact' },
];

const legalLinks = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Refunds', to: '/refunds' },
  { label: 'Disclosures', to: '/disclosures' },
];

const labelCls = 'font-sans text-xs tracking-[0.3em] uppercase text-foreground mb-5';
const linkCls = 'font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors';
const socialCls = 'font-sans text-xs text-muted-foreground hover:text-foreground transition-colors';

export default function SiteFooter() {
  return (
    <footer className="relative py-16 md:py-32 px-6 md:px-16 overflow-hidden">
      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
        <span className="font-sans text-[15vw] font-bold uppercase tracking-wider text-foreground/[0.04] leading-none whitespace-nowrap">
          Jon Bon
        </span>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="w-full h-px bg-border mb-12" />

        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-2 md:col-span-5">
            <p className={labelCls}>jooonbon</p>
            <p className="font-serif text-sm text-muted-foreground max-w-sm leading-relaxed">
              Travel films by Jon Bon Tabas, a Filipino-Canadian filmmaker in Vancouver.
            </p>
            <div className="mt-8 max-w-sm">
              <NewsletterForm source="footer" />
            </div>
          </div>

          <nav aria-label="Site" className="md:col-span-2">
            <p className={labelCls}>Site</p>
            <ul className="space-y-3">
              {siteLinks.map((l) => (
                <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal" className="md:col-span-2">
            <p className={labelCls}>Legal</p>
            <ul className="space-y-3">
              {legalLinks.map((l) => (
                <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <div className="col-span-2 md:col-span-3">
            <p className={labelCls}>Follow</p>
            <div className="flex items-center gap-4">
              <a href={BRANDS.jooonbon.instagram} target="_blank" rel="noopener noreferrer" className={socialCls}>Instagram</a>
              <a href={BRANDS.jooonbon.youtube} target="_blank" rel="noopener noreferrer" className={socialCls}>YouTube</a>
            </div>
            <p className={`${labelCls} mt-10`}>Also by Jon</p>
            <Link to="/bonpoints" className="font-sans text-sm text-foreground hover:opacity-60 transition-opacity">
              bon.points ↗
            </Link>
            <p className="font-sans text-xs text-muted-foreground mt-2">Credit cards, finance and travel tips</p>
          </div>
        </div>

        <p className="mt-16 font-sans text-xs text-muted-foreground">
          © {new Date().getFullYear()} Jon Bon Tabas. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
