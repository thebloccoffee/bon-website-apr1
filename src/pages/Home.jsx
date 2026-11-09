import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { getVideos, getProducts } from '@/api/content';
import HeroSection from '../components/home/HeroSection';
import FeaturedPosts from '../components/home/FeaturedPosts';
import PortfolioPreview from '../components/home/PortfolioPreview';
import Section from '../components/home/Section';
import { VideoGrid, ProductGrid } from '../components/home/Rows';
import { fetchPosts } from '../components/home/postsQuery';
import BrandDoor from '@/components/shared/BrandDoor';

// Home = jooonbon (the main site). bon.points gets one band near the bottom.
export default function Home() {
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['home-posts-latest', 'jooonbon'],
    queryFn: () => fetchPosts({ brand: 'jooonbon', limit: 3, orderBy: 'created_at' }),
  });

  const { data: films = [] } = useQuery({
    queryKey: ['home-films'],
    queryFn: () => getVideos({ brand: 'jooonbon', format: 'long', limit: 6 }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['home-products-featured'],
    queryFn: () => getProducts({ brand: 'jooonbon', featured: true, limit: 3 }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['portfolio-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_projects')
        .select('*')
        .or('status.eq.published,status.is.null')
        .order('order', { ascending: true })
        .limit(6);
      return data || [];
    },
  });

  return (
    <>
      <HeroSection />

      {films.length > 0 && (
        <Section id="latest-films" label="Latest films" action={{ to: '/videos', label: 'All films' }}>
          <VideoGrid videos={films.slice(0, 3)} />
        </Section>
      )}

      <div id="work">
        <PortfolioPreview projects={projects} />
        <section className="px-tk-6 md:px-16 pb-16 md:pb-24">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-tk-6 border-t border-tk-border pt-tk-8">
            <p className="font-serif text-tk-3xl md:text-tk-4xl text-tk-text-primary max-w-xl leading-snug">
              Need a film for your event, brand or trip?
            </p>
            <Link
              to="/contact"
              className="shrink-0 inline-flex items-center justify-center font-sans text-tk-md tracking-[0.25em] uppercase
                         bg-foreground text-background px-tk-7 py-tk-4 rounded-tk-pill
                         transition-opacity duration-fast hover:opacity-80"
            >
              Book me
            </Link>
          </div>
        </section>
      </div>

      <FeaturedPosts posts={posts} isLoading={postsLoading} showBrand={false} />

      {products.length > 0 && (
        <Section id="featured-products" label="From the shop" action={{ to: '/shop', label: 'Shop' }}>
          <ProductGrid products={products} />
        </Section>
      )}

      <Section id="also-by-jon" label="Also by Jon">
        <div className="max-w-3xl">
          <BrandDoor brand="bonpoints" />
        </div>
      </Section>
    </>
  );
}
