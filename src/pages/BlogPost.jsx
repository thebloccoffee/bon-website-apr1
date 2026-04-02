import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import ShareBar from '../components/ShareBar';
import TableOfContents, { injectIds } from '../components/TableOfContents';
import GalleryLightbox from '../components/GalleryLightbox';

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

  if (isLoading || !post) {
    return (
      <div className="pt-28 pb-24 px-6 md:px-16">
        <div className="max-w-3xl mx-auto text-center py-24">
          <p className="font-serif text-muted-foreground">Loading dispatch...</p>
        </div>
      </div>
    );
  }

  const contentWithIds = injectIds(post.content || '');

  return (
    <div className="pt-28 pb-24">
      <div className="px-6 md:px-16 mb-12">
        <Link
          to="/journal"
          className="inline-flex items-center gap-2 font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Journal
        </Link>
      </div>

      {post.cover_image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden mb-16"
        >
          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
        </motion.div>
      )}

      <div className="px-6 md:px-16 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-6">
            {post.location && (
              <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground">
                {post.location}
              </span>
            )}
            {post.coordinates && (
              <>
                <span className="text-accent">·</span>
                <span className="font-sans text-xs text-accent">{post.coordinates}</span>
              </>
            )}
            {post.date_traveled && (
              <>
                <span className="text-accent">·</span>
                <span className="font-sans text-xs text-accent">
                  {format(new Date(post.date_traveled), 'MMMM yyyy')}
                </span>
              </>
            )}
          </div>

          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.02em] leading-[1.1] mb-8">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="font-serif text-xl text-muted-foreground leading-relaxed mb-12">
              {post.excerpt}
            </p>
          )}

          <div className="w-16 h-px bg-accent mb-12" />
        </motion.div>

        <div className="flex gap-16 items-start">
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div
              className="prose-chronicle ql-content"
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />
          </motion.div>

          <TableOfContents html={post.content || ''} />
        </div>

        {post.gallery && post.gallery.length > 0 && (
          <GalleryLightbox images={post.gallery} captions={post.gallery_captions || []} />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border flex items-center gap-4 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="font-sans text-xs tracking-[0.15em] uppercase text-accent border border-border px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <ShareBar title={post.title} image={post.cover_image} />
      </div>
    </div>
  );
}
