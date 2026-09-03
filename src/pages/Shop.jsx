import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useLemonSqueezy } from '@/hooks/use-lemonsqueezy';

const CATEGORY_LABELS = {
  lut: 'LUTs',
  preset: 'Presets',
  guide: 'Travel Guides',
  bundle: 'Bundles',
};

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState('all');
  useLemonSqueezy();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['shop-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shop_products')
        .select('*')
        .eq('status', 'published')
        .order('order', { ascending: true });
      return data || [];
    },
  });

  const categories = [
    { value: 'all', label: 'All' },
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((value) => ({
      value,
      label: CATEGORY_LABELS[value] ?? value.replace(/_/g, ' '),
    })),
  ];

  const filtered =
    activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="pt-28 pb-24 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">
            The Shop
          </h1>
          <p className="font-serif text-lg text-muted-foreground mt-4 max-w-lg">
            The colour and the craft behind the films—LUTs, presets, and the guides I actually
            travel with. Instant download.
          </p>
        </motion.div>

        {categories.length > 2 && (
          <div className="flex items-center gap-6 mb-16 overflow-x-auto filmstrip-scroll -mx-6 px-6 md:mx-0 md:px-0">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`font-sans text-xs tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 pb-1 border-b ${
                  activeCategory === cat.value
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse aspect-[4/5] bg-muted rounded" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="font-serif text-muted-foreground text-center py-24">
            Nothing here yet. Something is coming.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <AnimatePresence mode="wait">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link to={`/shop/${product.slug}`} className="group block">
                    <div className="aspect-[4/5] overflow-hidden bg-muted mb-5">
                      {product.cover_image && (
                        <img
                          src={product.cover_image}
                          alt={product.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="font-sans text-lg font-light tracking-[-0.01em]">
                        {product.title}
                      </h2>
                      <span className="font-sans text-sm text-muted-foreground whitespace-nowrap">
                        {product.price_formatted}
                      </span>
                    </div>
                    {product.subtitle && (
                      <p className="font-serif text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {product.subtitle}
                      </p>
                    )}
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
