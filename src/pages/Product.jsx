import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ArrowLeft } from 'lucide-react';
import { getProduct } from '@/api/content';
import Seo from '@/components/shared/Seo';
import BuyButton from '@/components/shop/BuyButton';
import BeforeAfter from '@/components/shop/BeforeAfter';
import Markdown from '@/components/shop/Markdown';
import ProductFaq, { faqJsonLd } from '@/components/shop/ProductFaq';
import { brandOf, brandScope, categoryLabel } from '@/components/shop/shopMeta';

function productJsonLd(product) {
  const amount = Number(String(product.price_formatted || '').replace(/[^0-9.]/g, ''));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.subtitle || undefined,
    image: product.cover_image || undefined,
    brand: { '@type': 'Brand', name: brandOf(product).name },
    ...(amount > 0 && product.checkout_url
      ? { offers: { '@type': 'Offer', price: amount.toFixed(2), priceCurrency: 'CAD', availability: 'https://schema.org/InStock' } }
      : {}),
  };
}

export default function Product() {
  const { slug } = useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: ['shop-product', slug],
    queryFn: () => getProduct(slug),
  });

  if (isLoading) {
    return (
      <div className="pt-28 pb-24 px-4 md:px-16 max-w-7xl mx-auto min-h-screen">
        <div className="animate-pulse aspect-[4/3] md:w-1/2 bg-muted rounded-tk-xs" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-40 pb-24 px-4 text-center min-h-screen">
        <Seo title="Product not found" />
        <p className="font-serif text-muted-foreground">That product isn't available.</p>
        <Link to="/shop" className="inline-block mt-6 font-sans text-tk-xs tracking-[0.2em] uppercase border-b border-foreground">
          Back to shop
        </Link>
      </div>
    );
  }

  const hasCompare = product.before_image && product.after_image;
  const faqLd = faqJsonLd(product);
  const jsonLd = faqLd ? [productJsonLd(product), faqLd] : productJsonLd(product);

  return (
    <div className="pt-28 pb-24 px-4 md:px-16 min-h-screen" {...brandScope(product)}>
      <Seo
        title={product.title}
        description={product.subtitle || product.title}
        image={product.cover_image}
        jsonLd={jsonLd}
      />
      <div className="max-w-7xl mx-auto">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 font-sans text-tk-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-start">
          <div className="min-w-0">
            {hasCompare ? (
              <BeforeAfter before={product.before_image} after={product.after_image} alt={product.title} className="aspect-[4/3]" />
            ) : (
              product.cover_image && (
                <img src={product.cover_image} alt={product.title} className="w-full aspect-[4/3] object-cover bg-muted rounded-tk-xs" />
              )
            )}
            {product.gallery?.length > 0 && (
              <div className="grid grid-cols-3 gap-tk-3 mt-tk-3">
                {product.gallery.map((src, i) => (
                  <img key={i} src={src} alt="" loading="lazy" className="w-full aspect-square object-cover bg-muted rounded-tk-xs" />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="font-sans text-tk-xs tracking-[0.2em] uppercase text-muted-foreground mb-tk-3">
              {brandOf(product).name}
              {product.category ? ` · ${categoryLabel(product.category)}` : ''}
            </p>
            <h1 className="font-sans text-3xl md:text-5xl font-light tracking-[-0.02em] leading-[1.1] break-words">
              {product.title}
            </h1>
            {product.subtitle && <p className="font-serif text-tk-xl text-muted-foreground mt-tk-4">{product.subtitle}</p>}

            {product.price_formatted && (
              <p className="font-sans text-tk-3xl font-light mt-tk-6">
                {product.price_formatted} <span className="text-tk-sm text-muted-foreground">CAD</span>
              </p>
            )}

            <div className="mt-tk-6">
              <BuyButton product={product} className="w-full sm:w-auto" />
              <p className="font-sans text-tk-xs tracking-[0.1em] uppercase text-muted-foreground mt-tk-4">
                Instant download · Secure checkout by Stripe · Taxes shown at checkout
              </p>
            </div>

            {product.description && (
              <Markdown className="font-serif text-tk-lg mt-tk-8">{product.description}</Markdown>
            )}

            {product.features?.length > 0 && (
              <ul className="mt-tk-8 space-y-tk-3">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-tk-3 font-serif text-tk-md">
                    <Check size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <ProductFaq product={product} />

            <p className="font-sans text-tk-xs text-muted-foreground mt-tk-8">
              Questions about an order? See the <Link to="/refunds" className="underline underline-offset-4">refund policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
