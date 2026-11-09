import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getVideos, getDestinations } from '@/api/content';
import { fetchPosts } from '@/components/home/postsQuery';
import { PostGrid } from '@/components/shared/PostCard';
import { VideoGrid } from '@/components/home/Rows';
import Section from '@/components/home/Section';
import StoriesTabs from '@/components/shared/StoriesTabs';
import Seo from '@/components/shared/Seo';

// /stories: Films, Journal and Destinations in one place, newest first.
// Each row links to its full filtered page.
export default function Stories() {
  const { data: videos = [] } = useQuery({
    queryKey: ['videos-all'],
    queryFn: () => getVideos(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ['brand-posts', 'jooonbon'],
    queryFn: () => fetchPosts({ brand: 'jooonbon' }),
  });
  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations-all'],
    queryFn: getDestinations,
  });

  const films = videos.filter((v) => v.brand === 'jooonbon' && (v.format || 'long') === 'long').slice(0, 6);
  const places = [...destinations].sort((a, b) => Number(!!b.featured) - Number(!!a.featured)).slice(0, 8);

  return (
    <div className="pt-28 pb-12">
      <Seo title="Stories" description="Travel films, journal posts and destinations by Jon Bon Tabas." />

      <div className="px-6 md:px-16"><div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">Stories</h1>
        <p className="font-serif text-lg text-muted-foreground mt-4 max-w-xl">
          Films, journal posts and the places behind them.
        </p>
      </header>

      <StoriesTabs className="!px-0 !mb-0" />
      </div></div>

      {films.length > 0 && (
        <Section id="stories-films" label="Films" action={{ to: '/videos', label: 'All films' }}>
          <VideoGrid videos={films} />
        </Section>
      )}

      {posts.length > 0 && (
        <Section id="stories-journal" label="Journal" action={{ to: '/journal', label: 'All posts' }}>
          <PostGrid posts={posts.slice(0, 6)} />
        </Section>
      )}

      {places.length > 0 && (
        <Section id="stories-destinations" label="Destinations" action={{ to: '/travel', label: 'All places' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-tk-5 gap-y-tk-8">
            {places.map((d) => (
              <Link key={d.slug} to={`/travel/${d.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden mb-tk-3 bg-muted">
                  {d.cover_image && (
                    <img
                      src={d.cover_image}
                      alt={d.name}
                      width="800"
                      height="600"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="font-sans text-tk-xs uppercase tracking-[0.2em] text-muted-foreground">{d.continent}</p>
                <p className="font-serif text-xl font-light mt-1">{d.name}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
