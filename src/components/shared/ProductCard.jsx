import React from 'react';
import { Link } from 'react-router-dom';
import { brandOf, brandScope, categoryLabel } from '@/components/shop/shopMeta';

// Image, name, CAD price, link to /shop/:slug. bon.points products carry
// their brand scope so tokens switch inside the card.
export default function ProductCard({ product }) {
  if (!product?.slug) return null;
  const brand = brandOf(product);

  return (
    <Link
      to={`/shop/${product.slug}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground rounded-tk-xs"
      {...brandScope(product)}
    >
      <div className="aspect-[4/5] overflow-hidden bg-muted rounded-tk-xs mb-tk-4">
        {product.cover_image && (
          <img
            src={product.cover_image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        )}
      </div>
      <p className="font-sans text-tk-xs tracking-[0.2em] uppercase text-muted-foreground mb-tk-1">
        {brand.name}
        {product.category ? ` · ${categoryLabel(product.category)}` : ''}
      </p>
      <div className="flex items-baseline justify-between gap-tk-4">
        <h3 className="font-sans text-tk-xl font-light tracking-[-0.01em] text-foreground">{product.title}</h3>
        {product.price_formatted && (
          <span className="font-sans text-tk-md text-muted-foreground whitespace-nowrap">
            {product.price_formatted} <span className="text-tk-xs">CAD</span>
          </span>
        )}
      </div>
      {product.subtitle && (
        <p className="font-serif text-tk-md text-muted-foreground mt-tk-1 leading-relaxed">{product.subtitle}</p>
      )}
    </Link>
  );
}
