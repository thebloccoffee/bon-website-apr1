import React from 'react';
import { cn } from '@/lib/utils';

// A Stripe Payment Link is just a URL, so checkout needs no SDK or script tag.
// The Payment Link's "after payment" redirect points at
// /shop/thanks?session_id={CHECKOUT_SESSION_ID} (see SHOP-SETUP.md).
const isHttps = (url) => typeof url === 'string' && /^https:\/\//i.test(url.trim());

export default function BuyButton({ product, className = '', children }) {
  const href = product?.checkout_url;

  if (!isHttps(href)) {
    return (
      <span
        className={cn(
          'inline-block font-sans text-tk-xs tracking-[0.2em] uppercase text-muted-foreground border border-border rounded-tk-xs px-8 py-4',
          className
        )}
      >
        Coming soon
      </span>
    );
  }

  return (
    <a
      href={href.trim()}
      rel="noopener"
      className={cn(
        'inline-block text-center font-sans text-tk-xs tracking-[0.2em] uppercase bg-foreground text-background rounded-tk-xs px-8 py-4 transition-opacity duration-300 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        className
      )}
    >
      {children ?? (product.price_formatted ? `Buy · ${product.price_formatted}` : 'Buy')}
    </a>
  );
}
