import React from 'react';
import { Link } from 'react-router-dom';

const COPY = {
  affiliate: 'Some links on this page may earn Jon a commission, at no extra cost to you.',
  'not-advice':
    'This is educational content and not financial advice. For your own situation, talk to a qualified professional.',
};

/**
 * Short inline disclosure with a link to /disclosures.
 * kind: 'affiliate' | 'not-advice'
 */
export default function Disclosure({ kind = 'affiliate', className = '' }) {
  const text = COPY[kind] || COPY.affiliate;
  return (
    <p className={`font-sans text-tk-lg text-muted-foreground leading-relaxed ${className}`}>
      {text}{' '}
      <Link to="/disclosures" className="underline underline-offset-2 hover:text-foreground transition-colors">
        Disclosures
      </Link>
    </p>
  );
}
