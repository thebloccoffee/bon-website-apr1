import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function FeaturedPosts({ posts }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-24 md:py-32 px-6 md:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-6 mb-16">
          <div className="w-12 h-px bg-accent/60" />
          <span className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground">
            Recent dispatches
          </span>
        </div>

        {/* Posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to={`/journal/${post.slug || post.id}`} className="group block">
                {/* Image */}
                <div className="aspect-[3/2] overflow-hidden mb-6">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 mb-3">
                  {post.location && (
                    <span className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">
                      {post.location}
                    </span>
                  )}
                  {post.coordinates && (
                    <>
                      <span className="text-accent">·</span>
                      <span className="font-sans text-xs text-accent">
                        {post.coordinates}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-sans text-xl md:text-2xl font-light tracking-[-0.01em] leading-tight mb-3 group-hover:text-accent transition-colors duration-500">
                  {post.title}
                </h3>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="font-serif text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                )}

                {/* Date */}
                {post.date_traveled && (
                  <p className="font-sans text-xs text-accent mt-4">
                    {format(new Date(post.date_traveled), 'MMMM yyyy')}
                  </p>
                )}
              </Link>
            </motion.article>
          ))}
        </div>

        {/* View all link */}
        <div className="mt-16 text-center">
          <Link
            to="/journal"
            className="font-sans text-xs tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 border-b border-accent pb-1"
          >
            View all entries
          </Link>
        </div>
      </div>
    </section>
  );
}