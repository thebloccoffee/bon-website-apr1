import React from 'react';
import { cn } from '@/lib/utils';
import { checkoutProvider } from './checkoutProvider';

// Checkout is a plain link: Stan Store by default, or a Stripe Payment Link /
// Gumroad. Stripe links use /shop/thanks for delivery (see SHOP-SETUP.md);
// Stan and Gumroad deliver the files themselves.
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

  const provider = checkoutProvider(href);
  const price = product.price_formatted ? ` · ${product.price_formatted}` : '';
  const label = provider && provider.key !== 'stripe' ? `Buy on ${provider.name}${price}` : `Buy${price}`;

  return (
    <a
      href={href.trim()}
      rel="noopener"
      className={cn(
        'inline-block text-center font-sans text-tk-xs tracking-[0.2em] uppercase bg-foreground text-background rounded-tk-xs px-8 py-4 transition-opacity duration-300 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        className
      )}
    >
      {children ?? label}
    </a>
  );
}
