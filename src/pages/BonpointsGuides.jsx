import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostGrid } from '@/components/shared/PostCard';
import Disclosure from '@/components/shared/Disclosure';
import Seo from '@/components/shared/Seo';
import { fetchPosts } from '@/components/home/postsQuery';

// bon.points guides = blog_posts with brand 'bonpoints'. Each opens at /bonpoints/guides/:slug.
export default function BonpointsGuides() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['brand-posts', 'bonpoints'],
    queryFn: () => fetchPosts({ brand: 'bonpoints' }),
  });

  return (
    <div className="pt-36 pb-24 px-6 md:px-16 min-h-screen">
      <Seo title="Guides" description="Credit card, points and travel money guides from bon.points." />
      <div className="max-w-6xl mx-auto">
        <p className="font-sans text-tk-xs uppercase tracking-[0.3em] text-muted-foreground mb-tk-4">bon.points</p>
        <h1 className="font-sans text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.1]">Guides</h1>
        <p className="font-sans text-lg text-muted-foreground mt-4 max-w-xl">
          Credit cards, points and travel money, written for Canadians.
        </p>
        <div className="mt-tk-6 space-y-tk-2">
          <Disclosure kind="not-advice" />
          <Disclosure kind="affiliate" />
        </div>

        <div className="mt-12">
          {isLoading ? null : posts.length > 0 ? (
            <PostGrid posts={posts} glass />
          ) : (
            <p className="font-sans text-tk-lg text-muted-foreground">
              The first guides are on the way. Get them by email from the{' '}
              <a href="/bonpoints#newsletter" className="underline underline-offset-4 hover:text-foreground">bon.points newsletter</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
