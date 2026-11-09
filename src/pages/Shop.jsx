import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/api/content';
import ProductCard from '@/components/shared/ProductCard';
import Seo from '@/components/shared/Seo';
import { categoryLabel } from '@/components/shop/shopMeta';
import { BRANDS } from '@/lib/brands';

const filterBtn = (active) =>
  `font-sans text-tk-xs tracking-[0.2em] uppercase whitespace-nowrap pb-1 border-b transition-colors duration-300 ${
    active ? 'text-foreground border-foreground' : 'text-muted-foreground border-transparent hover:text-foreground'
  }`;

export default function Shop() {
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['shop-products'],
    queryFn: () => getProducts(),
  });

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );
  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter((b) => BRANDS[b]))),
    [products]
  );

  const shown = products.filter(
    (p) => (category === 'all' || p.category === category) && (brand === 'all' || p.brand === brand)
  );

  return (
    <div className="pt-28 pb-24 px-4 md:px-16 min-h-screen">
      <Seo
        title="Shop"
        description="LUTs, presets and guides from jooonbon and bon.points. Instant download, prices in CAD."
      />
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 md:mb-16">
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">Shop</h1>
          <p className="font-serif text-tk-xl text-muted-foreground mt-tk-4 max-w-lg">
            The LUTs, presets and guides I use myself. You download right after checkout.
          </p>
        </header>

        {(categories.length > 1 || brands.length > 1) && (
          <div className="flex flex-col gap-tk-4 mb-12">
            {brands.length > 1 && (
              <div className="flex gap-tk-6 overflow-x-auto" role="group" aria-label="Filter by brand">
                <button type="button" aria-pressed={brand === 'all'} className={filterBtn(brand === 'all')} onClick={() => setBrand('all')}>
                  Everything
                </button>
                {brands.map((b) => (
                  <button key={b} type="button" aria-pressed={brand === b} className={filterBtn(brand === b)} onClick={() => setBrand(b)}>
                    {BRANDS[b].name}
                  </button>
                ))}
              </div>
            )}
            {categories.length > 1 && (
              <div className="flex gap-tk-6 overflow-x-auto" role="group" aria-label="Filter by category">
                <button type="button" aria-pressed={category === 'all'} className={filterBtn(category === 'all')} onClick={() => setCategory('all')}>
                  All
                </button>
                {categories.map((c) => (
                  <button key={c} type="button" aria-pressed={category === c} className={filterBtn(category === c)} onClick={() => setCategory(c)}>
                    {categoryLabel(c)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse aspect-[4/5] bg-muted rounded-tk-xs" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="font-serif text-muted-foreground text-center py-24">Nothing here yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 md:gap-x-12">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
