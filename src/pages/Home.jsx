import React from 'react';
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

export default function Home() {
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['home-posts-latest'],
    queryFn: () => fetchPosts({ limit: 3, orderBy: 'created_at' }),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['home-videos'],
    queryFn: () => getVideos({ limit: 6 }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['home-products-featured'],
    queryFn: () => getProducts({ featured: true, limit: 3 }),
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

      <Section id="brands" label="Two channels" title="Pick a door">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-tk-6 md:gap-tk-8">
          <BrandDoor brand="jooonbon" index={0} />
          <BrandDoor brand="bonpoints" index={1} />
        </div>
      </Section>

      {videos.length > 0 && (
        <Section id="latest-videos" label="Latest videos" action={{ to: '/videos', label: 'All videos' }}>
          <VideoGrid videos={videos} showBrand />
        </Section>
      )}

      {products.length > 0 && (
        <Section id="featured-products" label="From the shop" action={{ to: '/shop', label: 'Shop' }}>
          <ProductGrid products={products} />
        </Section>
      )}

      <FeaturedPosts posts={posts} isLoading={postsLoading} />
      <PortfolioPreview projects={projects} />
    </>
  );
}
