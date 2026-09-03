import React from 'react';

// A Stripe Payment Link is just a URL, so checkout needs no SDK and no script
// tag — the fastest possible path from click to a payment form.
export default function BuyButton({ product, className = '', children }) {
  const href = product?.checkout_url;

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
      className={`inline-block font-sans text-xs tracking-[0.2em] uppercase bg-foreground text-background px-8 py-4 transition-opacity duration-300 hover:opacity-80 ${className}`}
    >
      {children ?? `Buy — ${product.price_formatted ?? ''}`}
    </a>
  );
}
