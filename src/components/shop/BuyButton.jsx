import React from 'react';
import { buildCheckoutUrl } from '@/hooks/use-lemonsqueezy';

export default function BuyButton({ product, className = '', children }) {
  const href = buildCheckoutUrl(product);

  if (!href) {
    return (
      <span className={`inline-block font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground border border-border px-8 py-4 ${className}`}>
        Coming soon
      </span>
    );
  }

  return (
    <a
      href={href}
      className={`lemonsqueezy-button inline-block font-sans text-xs tracking-[0.2em] uppercase bg-foreground text-background px-8 py-4 transition-opacity duration-300 hover:opacity-80 ${className}`}
    >
      {children ?? `Buy — ${product.price_formatted ?? ''}`}
    </a>
  );
}
