import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const LAST_UPDATED = '2026-11-08';

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/refunds', label: 'Refunds' },
  { to: '/disclosures', label: 'Disclosures' },
];

/**
 * Shared layout for the legal pages.
 * sections: [{ id, title, body: ReactNode }]
 */
export default function LegalPage({ title, intro, sections = [], lastUpdated = LAST_UPDATED }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | Jon Bon Tabas`;
    return () => { document.title = prev; };
  }, [title]);

  return (
    <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen">
      <article className="max-w-3xl mx-auto">
        <header className="mb-12">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">Legal</p>
          <h1 className="font-serif text-4xl md:text-6xl font-light tracking-[-0.02em] leading-tight">{title}</h1>
          <p className="mt-4 font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground">
            Last updated {lastUpdated}
          </p>
          {intro && (
            <div className="mt-8 font-serif text-lg text-muted-foreground leading-relaxed space-y-4">{intro}</div>
          )}
        </header>

        {sections.length > 1 && (
          <nav aria-label="On this page" className="mb-14 border-y border-border py-6">
            <p className="font-sans text-xs tracking-[0.3em] uppercase text-foreground mb-4">On this page</p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="tabular-nums mr-2 text-muted-foreground/60">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="space-y-14">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-serif text-2xl md:text-3xl font-light mb-5">{s.title}</h2>
              <div className="legal-body font-sans text-tk-2xl leading-relaxed text-muted-foreground space-y-4 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-foreground [&_strong]:text-foreground [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-20 pt-8 border-t border-border flex flex-wrap gap-x-8 gap-y-3">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </footer>
      </article>
    </div>
  );
}

/** Visible marker for text Jon still needs to confirm. Search the repo for "<ToFill" before launch. */
export function ToFill({ children }) {
  return (
    <span className="font-sans text-foreground border border-dashed border-border px-1.5 py-0.5 rounded-tk-xs">
      [{children}]
    </span>
  );
}
