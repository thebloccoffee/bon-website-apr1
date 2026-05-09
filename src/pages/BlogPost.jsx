import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import ShareBar from '../components/ShareBar';
import TableOfContents, { injectIds, MobileTOC } from '../components/TableOfContents';
import GalleryLightbox from '../components/GalleryLightbox';
import FloatingShareSidebar from '../components/FloatingShareSidebar';

function readingTime(html) {
  const words = (html || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      return data;
    },
  });

  const { data: allPosts } = useQuery({
    queryKey: ['blog-posts-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, slug, title, cover_image, date_traveled')
        .eq('status', 'published')
        .order('date_traveled', { ascending: false });
      return data || [];
    },
  });

  if (isLoading || !post) {
    return (
      <div className="pt-28 pb-24 px-6 md:px-16 animate-pulse">
        <div className="max-w-3xl mx-auto">
          <div className="h-3 bg-muted rounded w-24 mb-10" />
          <div className="h-8 bg-muted rounded w-2/3 mb-4" />
          <div className="h-3 bg-muted rounded w-40 mb-12" />
          <div className="aspect-[16/9] bg-muted rounded mb-12" />
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-3 bg-muted rounded w-full" />)}
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  const contentWithIds = injectIds(post.content || '');
  const minutes = readingTime(post.content || '');

  const postIndex = allPosts?.findIndex(p => p.slug === slug) ?? -1;
  const prevPost = postIndex > 0 ? allPosts[postIndex - 1] : null;
  const nextPost = postIndex >= 0 && postIndex < (allPosts?.length ?? 0) - 1 ? allPosts[postIndex + 1] : null;

  return (
    <div className="pt-28 pb-24">
      <FloatingShareSidebar title={post.title} />

      {/* Back link */}
      <div className="px-6 md:px-16 mb-10">
        <Link
          to="/journal"
          className="inline-flex items-center gap-2 font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Journal
        </Link>
      </div>

      {/* Hero image */}
      {post.cover_image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden mb-14"
        >
          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
        </motion.div>
      )}

      <div className="px-6 md:px-16 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-3xl"
        >
          {/* Meta row — categories / location / date / reading time */}
          <div className="flex items-center gap-3 flex-wrap mb-5">
            {post.location && (
              <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground border border-border px-2.5 py-1">
                {post.location}
              </span>
            )}
            {post.tags && post.tags.slice(0, 2).map(tag => (
              <span key={tag} className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">
                {tag}
              </span>
            ))}
            {post.date_traveled && (
              <>
                <span className="text-border">·</span>
                <span className="font-sans text-xs text-muted-foreground">
                  {format(new Date(post.date_traveled), 'MMMM d, yyyy')}
                </span>
              </>
            )}
            <span className="text-border">·</span>
            <span className="font-sans text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={11} />
              {minutes} min read
            </span>
          </div>

          {/* Title */}
          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.02em] leading-[1.1] mb-6">
            {post.title}
          </h1>

          {/* Excerpt / intro */}
          {post.excerpt && (
            <p className="font-serif text-xl text-muted-foreground leading-relaxed mb-10">
              {post.excerpt}
            </p>
          )}

          {post.coordinates && (
            <p className="font-sans text-xs text-accent tracking-widest mb-6">{post.coordinates}</p>
          )}

          <div className="w-16 h-px bg-border mb-10" />
        </motion.div>

        {/* Content area — mobile TOC + body + desktop TOC */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {/* Mobile collapsible TOC */}
          <div className="max-w-3xl">
            <MobileTOC html={post.content || ''} />
          </div>

          <div className="flex gap-16 items-start">
            <div className="flex-1 min-w-0 max-w-3xl">
              <div
                className="prose-chronicle ql-content"
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />
            </div>

            <TableOfContents html={post.content || ''} />
          </div>
        </motion.div>

        {/* Gallery */}
        {post.gallery && post.gallery.length > 0 && (
          <div className="max-w-3xl">
            <GalleryLightbox images={post.gallery} captions={post.gallery_captions || []} />
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="max-w-3xl mt-16 pt-8 border-t border-border flex items-center gap-3 flex-wrap">
            <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mr-2">Tagged</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground border border-border px-3 py-1 hover:border-foreground hover:text-foreground transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Share bar */}
        <div className="max-w-3xl">
          <ShareBar title={post.title} image={post.cover_image} />
        </div>

        {/* Prev / Next navigation */}
        {(prevPost || nextPost) && (
          <div className="max-w-3xl mt-16 pt-10 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6">
            {prevPost ? (
              <Link
                to={`/journal/${prevPost.slug}`}
                className="group flex flex-col gap-3"
              >
                <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground flex items-center gap-2">
                  <ArrowLeft size={11} /> Previous
                </span>
                {prevPost.cover_image && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={prevPost.cover_image}
                      alt={prevPost.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                )}
                <span className="font-sans text-sm font-light group-hover:text-muted-foreground transition-colors leading-snug">
                  {prevPost.title}
                </span>
              </Link>
            ) : <div />}

            {nextPost ? (
              <Link
                to={`/journal/${nextPost.slug}`}
                className="group flex flex-col gap-3 sm:items-end sm:text-right"
              >
                <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground flex items-center gap-2 sm:flex-row-reverse">
                  <ArrowRight size={11} /> Next
                </span>
                {nextPost.cover_image && (
                  <div className="aspect-[16/9] overflow-hidden w-full">
                    <img
                      src={nextPost.cover_image}
                      alt={nextPost.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                )}
                <span className="font-sans text-sm font-light group-hover:text-muted-foreground transition-colors leading-snug">
                  {nextPost.title}
                </span>
              </Link>
            ) : <div />}
          </div>
        )}
      </div>
    </div>
  );
}
