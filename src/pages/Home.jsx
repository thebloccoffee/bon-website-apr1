import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import HeroSection from '../components/home/HeroSection';
import FeaturedPosts from '../components/home/FeaturedPosts';
import PortfolioPreview from '../components/home/PortfolioPreview';

export default function Home() {
  const { data: posts } = useQuery({
    queryKey: ['blog-posts-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,cover_image,location,coordinates,date_traveled')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    initialData: [],
  });

  const { data: projects } = useQuery({
    queryKey: ['portfolio-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_projects')
        .select('*')
        .order('order', { ascending: true })
        .limit(6);
      return data || [];
    },
    initialData: [],
  });

  return (
    <>
      <HeroSection />
      <FeaturedPosts posts={posts} />
      <PortfolioPreview projects={projects} />
    </>
  );
}
