import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Seo from '@/components/shared/Seo';
import { motion } from 'framer-motion';
import { getDestination, getVideos } from '@/api/content';
import { PostGrid } from '@/components/shared/PostCard';
import Section from '@/components/home/Section';
import { VideoGrid } from '@/components/home/Rows';
import { fetchPosts } from '@/components/home/postsQuery';

const norm = (v) => (v || '').toString().trim().toLowerCase();

// A post belongs to a destination when its location or city contains the
// destination name (case-insensitive), or one of its tags equals the name or slug.
function matchesDestination(post, name, slug) {
  if (!name) return false;
  if (norm(post.location).includes(name) || norm(post.city).includes(name)) return true;
  return (post.tags || []).some((t) => norm(t) === name || norm(t) === slug);
}

export default function TravelDestination() {
  const { slug } = useParams();

  const { data: dest, isLoading } = useQuery({
    queryKey: ['destination', slug],
    queryFn: () => getDestination(slug),
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['posts-all-brands'],
    queryFn: () => fetchPosts(),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['destination-videos', slug],
    queryFn: () => getVideos({ destination: slug }),
  });

  const posts = useMemo(
    () => allPosts.filter((p) => matchesDestination(p, norm(dest?.name), norm(slug))),
    [allPosts, dest, slug]
  );

  if (isLoading) {
    return (
      <div className="pt-28 pb-24 px-tk-6 md:px-16 min-h-screen" aria-busy="true">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-3 bg-muted rounded w-24 mb-tk-6" />
          <div className="h-12 bg-muted rounded w-2/3 mb-tk-6" />
          <div className="aspect-[21/9] bg-muted rounded-tk-xs" />
        </div>
      </div>
    );
  }

  if (!dest) {
    return (
      <div className="pt-28 pb-24 px-tk-6 md:px-16 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] mb-tk-6">Destination not found</h1>
          <Link to="/travel" className="font-sans text-tk-md tracking-[0.25em] uppercase text-tk-text-secondary border-b border-tk-border pb-tk-1 hover:text-tk-text-primary">
            ← All destinations
          </Link>
        </div>
      </div>
    );
  }

  const empty = posts.length === 0 && videos.length === 0;

  return (
    <div className="pt-28 pb-12">
      <Seo title={dest.name} description={dest.tagline || dest.description} image={dest.cover_image} />
      <header className="px-tk-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-6xl mx-auto"
        >
          <Link to="/travel" className="font-sans text-tk-md tracking-[0.25em] uppercase text-tk-text-tertiary hover:text-tk-text-primary transition-colors">
            ← Destinations
          </Link>
          <p className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary mt-tk-8 mb-tk-4">
            {[dest.continent, dest.region].filter(Boolean).join(' · ')}
          </p>
          <h1 className="font-sans text-5xl md:text-7xl font-light tracking-[-0.02em] leading-none mb-tk-6">
            {dest.name}
          </h1>
          {dest.tagline && (
            <p className="font-serif text-tk-3xl text-tk-text-secondary max-w-2xl leading-relaxed">{dest.tagline}</p>
          )}
          {dest.cover_image && (
            <div className="mt-tk-8 aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-tk-xs bg-tk-surface-raised">
              <img
                src={dest.cover_image}
                alt={dest.name}
                width="1600"
                height="686"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {dest.description && (
            <p className="font-serif text-tk-2xl text-tk-text-secondary max-w-2xl leading-relaxed mt-tk-8">
              {dest.description}
            </p>
          )}
        </motion.div>
      </header>

      {videos.length > 0 && (
        <Section id="destination-videos" label={`Videos from ${dest.name}`}>
          <VideoGrid videos={videos} showBrand />
        </Section>
      )}

      {posts.length > 0 && (
        <Section id="destination-posts" label={`Posts about ${dest.name}`}>
          <PostGrid posts={posts} showBrand />
        </Section>
      )}

      {empty && (
        <div className="px-tk-6 md:px-16 py-16">
          <p className="max-w-6xl mx-auto font-serif text-tk-xl text-tk-text-tertiary">
            Nothing published for {dest.name} yet.
          </p>
        </div>
      )}
    </div>
  );
}
