import { postPath } from '@/lib/brands';
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BrandLabel } from '@/components/home/Section';

// Grid card for a blog post. Extracted from home/FeaturedPosts.jsx.
// `showBrand` adds a small jooonbon / bon.points label (used on mixed lists).
export default function PostCard({ post, index = 0, showBrand = false, glass = false }) {
  if (!post) return null;
  const place = post.city && post.location && !post.location.includes(post.city)
    ? `${post.city}, ${post.location}`
    : post.location || post.city;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index, 5) * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={glass ? 'bp-glass rounded-tk-xs p-tk-4' : ''}
    >
      <Link
        to={postPath(post)}
        className="group block rounded-tk-xs
                   focus-visible:outline-2 focus-visible:outline-tk-text-primary
                   focus-visible:outline-offset-4"
      >
        <div className="aspect-[3/2] overflow-hidden rounded-tk-xs mb-tk-6 bg-tk-surface-raised">
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt=""
              loading="lazy"
              decoding="async"
              width="600"
              height="400"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full" aria-hidden="true" />
          )}
        </div>

        {(showBrand || place || post.coordinates) && (
          <div className="flex items-center flex-wrap gap-tk-4 mb-tk-3">
            {showBrand && <BrandLabel brand={post.brand} />}
            {place && (
              <span className="font-sans text-tk-md tracking-[0.15em] uppercase text-tk-text-tertiary">
                {place}
              </span>
            )}
            {post.coordinates && (
              <>
                <span className="text-tk-text-tertiary" aria-hidden="true">·</span>
                <span className="font-sans text-tk-md text-tk-text-secondary">{post.coordinates}</span>
              </>
            )}
          </div>
        )}

        <h3 className="font-sans text-tk-3xl font-light tracking-[-0.01em] mb-tk-3 text-tk-text-primary
                       transition-colors duration-normal group-hover:text-tk-text-secondary">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="font-serif text-tk-xl text-tk-text-secondary leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {post.date_traveled && (
          <p className="font-sans text-tk-md text-tk-text-tertiary mt-tk-5">
            {format(new Date(post.date_traveled), 'MMMM yyyy')}
          </p>
        )}
      </Link>
    </motion.article>
  );
}

export function PostGrid({ posts, showBrand = false, glass = false }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-tk-8 md:gap-12">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} index={i} showBrand={showBrand} glass={glass} />
      ))}
    </div>
  );
}
