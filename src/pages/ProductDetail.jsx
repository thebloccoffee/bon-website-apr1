import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useLemonSqueezy } from '@/hooks/use-lemonsqueezy';
import BuyButton from '@/components/shop/BuyButton';
import BeforeAfter from '@/components/shop/BeforeAfter';

export default function ProductDetail() {
  const { slug } = useParams();
  useLemonSqueezy();

  const { data: product, isLoading } = useQuery({
    queryKey: ['shop-product', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('shop_products')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="pt-28 pb-24 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="animate-pulse aspect-[21/9] bg-muted rounded" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-40 pb-24 px-6 text-center">
        <p className="font-serif text-muted-foreground">That product does not exist.</p>
        <Link
          to="/shop"
          className="inline-block mt-6 font-sans text-xs tracking-[0.2em] uppercase border-b border-foreground"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const hasCompare = product.before_image && product.after_image;

  return (
    <div className="pt-28 pb-24 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft size={14} /> Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {hasCompare ? (
              <BeforeAfter
                before={product.before_image}
                after={product.after_image}
                className="aspect-[4/3]"
              />
            ) : (
              product.cover_image && (
                <img
                  src={product.cover_image}
                  alt={product.title}
                  className="w-full aspect-[4/3] object-cover bg-muted"
                />
              )
            )}

            {product.gallery?.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {product.gallery.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-square object-cover bg-muted"
                  />
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-sans text-3xl md:text-5xl font-light tracking-[-0.02em] leading-[1.1]">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="font-serif text-lg text-muted-foreground mt-4">{product.subtitle}</p>
            )}

            {product.description && (
              <p className="font-serif text-base leading-relaxed mt-8 whitespace-pre-line">
                {product.description}
              </p>
            )}

            {product.features?.length > 0 && (
              <ul className="mt-8 space-y-3">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 font-serif text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-12 pt-8 border-t border-border">
              <BuyButton product={product} />
              <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-muted-foreground mt-5">
                Instant download · Secure checkout · Tax handled at checkout
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
