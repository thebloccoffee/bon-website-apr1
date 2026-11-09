import React from 'react';
import { Link } from 'react-router-dom';

// Section shell shared by Home, brand pages and /travel/:slug.
// Small uppercase label with a rule, optional title, optional "view all" link.
export default function Section({ id, label, title, action, className = '', children }) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      className={`py-16 md:py-24 px-tk-6 md:px-16 ${className}`}
      aria-labelledby={headingId}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-tk-6 mb-tk-8">
          <div>
            <div className="flex items-center gap-tk-6">
              <div className="w-12 h-px bg-tk-border" aria-hidden="true" />
              <span className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary">
                {label}
              </span>
            </div>
            {title ? (
              <h2 id={headingId} className="font-sans text-tk-4xl md:text-4xl font-light tracking-[-0.02em] mt-tk-5 text-tk-text-primary">
                {title}
              </h2>
            ) : (
              <h2 id={headingId} className="sr-only">{label}</h2>
            )}
          </div>
          {action && (
            <Link
              to={action.to}
              className="shrink-0 font-sans text-tk-md tracking-[0.25em] uppercase
                         text-tk-text-secondary border-b border-tk-border pb-tk-1
                         transition-colors duration-fast hover:text-tk-text-primary
                         focus-visible:outline-2 focus-visible:outline-tk-text-primary focus-visible:outline-offset-4"
            >
              {action.label}
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function BrandLabel({ brand }) {
  const name = brand === 'bonpoints' ? 'bon.points' : 'jooonbon';
  return (
    <span className="inline-block font-sans text-tk-xs tracking-[0.2em] uppercase text-tk-text-tertiary border border-tk-border rounded-tk-pill px-tk-3 py-tk-1">
      {name}
    </span>
  );
}
