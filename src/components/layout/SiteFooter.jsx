import React from 'react';
import { Link } from 'react-router-dom';
import { BRANDS } from '@/lib/brands';
import NewsletterForm from '@/components/shared/NewsletterForm';

const siteLinks = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Videos', to: '/videos' },
  { label: 'Portfolio', to: '/portfolio' },
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
            <p className={labelCls}>Jon Bon</p>
            <p className="font-serif text-sm text-muted-foreground max-w-sm leading-relaxed">
              Vancouver-based Filipino-Canadian creator. Travel films as jooonbon, credit cards and points as bon.points.
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
            <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
              {Object.values(BRANDS).map((b) => (
                <div key={b.key}>
                  <Link to={b.path} className="font-sans text-sm text-foreground hover:opacity-60 transition-opacity">
                    {b.name}
                  </Link>
                  <div className="flex items-center gap-4 mt-2">
                    <a href={b.instagram} target="_blank" rel="noopener noreferrer" className={socialCls} aria-label={`${b.name} on Instagram`}>
                      Instagram
                    </a>
                    <a href={b.youtube} target="_blank" rel="noopener noreferrer" className={socialCls} aria-label={`${b.name} on YouTube`}>
                      YouTube
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-16 font-sans text-xs text-muted-foreground">
          © {new Date().getFullYear()} Jon Bon Tabas. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
