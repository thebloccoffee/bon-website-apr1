import React from 'react';
import { PostGrid } from '@/components/shared/PostCard';
import Section from './Section';

export default function FeaturedPosts({ posts, isLoading, showBrand = true }) {
  if (!isLoading && (!posts || posts.length === 0)) return null;

  return (
    <Section id="featured-posts" label="From the journal" action={{ to: '/journal', label: 'View all' }}>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-tk-8 md:gap-12" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/2] rounded-tk-xs mb-tk-6 bg-tk-surface-raised" />
              <div className="h-3 rounded w-24 mb-tk-3 bg-tk-surface-raised" />
              <div className="h-6 rounded w-3/4 mb-tk-3 bg-tk-surface-raised" />
              <div className="h-4 rounded w-full bg-tk-surface-raised" />
            </div>
          ))}
        </div>
      ) : (
        <PostGrid posts={posts} showBrand={showBrand} />
      )}
    </Section>
  );
}
