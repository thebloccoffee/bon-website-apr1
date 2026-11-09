import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getVideos, getProducts } from '@/api/content';
import { BRANDS } from '@/lib/brands';
import { PostGrid } from '@/components/shared/PostCard';
import Section from './Section';
import { VideoGrid, ProductGrid } from './Rows';
import { fetchPosts } from './postsQuery';

// Shared layout for /jooonbon and /bonpoints: intro, then videos, posts and
// products for that brand (each row hidden when empty), then socials.
export default function BrandPage({ brand, title, intro, glass = false, top = null, bottom = null }) {
  const b = BRANDS[brand];

  const { data: videos = [] } = useQuery({
    queryKey: ['brand-videos', brand],
    queryFn: () => getVideos({ brand }),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ['brand-posts', brand],
    queryFn: () => fetchPosts({ brand }),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['brand-products', brand],
    queryFn: () => getProducts({ brand }),
  });

  const empty = videos.length === 0 && posts.length === 0 && products.length === 0;

  return (
    <div className="pt-28 pb-12">
      <header className="px-tk-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-6xl mx-auto"
        >
          <p className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary mb-tk-5">
            {b.tagline}
          </p>
          <h1 className="text-5xl md:text-7xl leading-none mb-tk-6 text-tk-text-primary">{title}</h1>
          <div className={`max-w-xl ${brand === 'bonpoints' ? 'font-sans' : 'font-serif'} text-tk-2xl md:text-tk-3xl text-tk-text-secondary leading-relaxed space-y-tk-4`}>
            {intro}
          </div>
          <SocialLinks brand={brand} className="mt-tk-8" />
        </motion.div>
      </header>

      {top}

      {videos.length > 0 && (
        <Section id={`${brand}-videos`} label="Videos" action={{ to: brand === 'bonpoints' ? '/bonpoints/videos' : '/videos', label: 'All videos' }}>
          <VideoGrid videos={videos.slice(0, 9)} glass={glass} />
        </Section>
      )}

      {posts.length > 0 && (
        <Section id={`${brand}-posts`} label={brand === 'bonpoints' ? 'Guides' : 'Journal'} action={brand === 'bonpoints' ? { to: '/bonpoints/guides', label: 'All guides' } : { to: '/journal', label: 'Journal' }}>
          <PostGrid posts={posts.slice(0, 6)} glass={glass} />
        </Section>
      )}

      {products.length > 0 && (
        <Section id={`${brand}-products`} label="Shop" action={{ to: '/shop', label: 'Shop' }}>
          <ProductGrid products={products} glass={glass} />
        </Section>
      )}

      {empty && (
        <div className="px-tk-6 md:px-16 py-16">
          <p className="max-w-6xl mx-auto font-sans text-tk-lg text-tk-text-tertiary">
            New {b.name} videos and posts will show up here. Until then, find them on Instagram and YouTube.
          </p>
        </div>
      )}

      {bottom}
    </div>
  );
}

export function SocialLinks({ brand, className = '' }) {
  const b = BRANDS[brand];
  const cls = 'font-sans text-tk-md tracking-[0.25em] uppercase text-tk-text-secondary border-b border-tk-border pb-tk-1 transition-colors duration-fast hover:text-tk-text-primary';
  return (
    <div className={`flex flex-wrap items-center gap-tk-7 ${className}`}>
      <a href={b.youtube} target="_blank" rel="noopener noreferrer" className={cls}>YouTube</a>
      <a href={b.instagram} target="_blank" rel="noopener noreferrer" className={cls}>Instagram</a>
    </div>
  );
}
