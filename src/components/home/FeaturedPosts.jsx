import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-tk-6 mb-tk-8">
      <div className="w-12 h-px bg-tk-border" />
      <span className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary">
        {children}
      </span>
    </div>
  );
}

export default function FeaturedPosts({ posts }) {
  const hasPosts = posts && posts.length > 0;

  return (
    <section
      className="py-24 md:py-32 px-tk-6 md:px-16"
      aria-labelledby="featured-posts-heading"
    >
      <div className="max-w-6xl mx-auto">
        <h2 id="featured-posts-heading" className="sr-only">
          Recent dispatches
        </h2>
        <SectionLabel>Recent dispatches</SectionLabel>

        {/* Empty state — nothing published yet, or the fetch came back bare */}
        {!hasPosts && (
          <p className="border border-dashed border-tk-border rounded-tk-xs
                        py-tk-8 px-tk-6 text-center
                        font-sans text-tk-lg text-tk-text-tertiary">
            No dispatches published yet. New entries land here first.
          </p>
        )}

        {hasPosts && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-tk-8 md:gap-12">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to={`/journal/${post.slug || post.id}`}
                  className="group block rounded-tk-xs
                             focus-visible:outline-2 focus-visible:outline-tk-text-primary
                             focus-visible:outline-offset-4"
                >
                  {/* Image */}
                  <div className="aspect-[3/2] overflow-hidden rounded-tk-xs mb-tk-6 bg-tk-surface-raised">
                    {post.cover_image ? (
                      <img
                        src={post.cover_image}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover
                                   transition-transform duration-700
                                   group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full" aria-hidden="true" />
                    )}
                  </div>

                  {/* Meta */}
                  {(post.location || post.coordinates) && (
                    <div className="flex items-center flex-wrap gap-tk-4 mb-tk-3">
                      {post.location && (
                        <span className="font-sans text-tk-md tracking-[0.15em] uppercase text-tk-text-tertiary">
                          {post.location}
                        </span>
                      )}
                      {post.coordinates && (
                        <>
                          <span className="text-tk-text-tertiary" aria-hidden="true">·</span>
                          <span className="font-sans text-tk-md text-tk-text-secondary">
                            {post.coordinates}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Title — long titles wrap rather than truncate */}
                  <h3 className="font-sans text-tk-3xl font-light tracking-[-0.01em] mb-tk-3
                                 text-tk-text-primary
                                 transition-colors duration-normal
                                 group-hover:text-tk-text-secondary">
                    {post.title}
                  </h3>

                  {/* Excerpt — clamped so uneven copy keeps the grid aligned */}
                  {post.excerpt && (
                    <p className="font-serif text-tk-xl text-tk-text-secondary leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}

                  {/* Date */}
                  {post.date_traveled && (
                    <p className="font-sans text-tk-md text-tk-text-tertiary mt-tk-5">
                      {format(new Date(post.date_traveled), 'MMMM yyyy')}
                    </p>
                  )}
                </Link>
              </motion.article>
            ))}
          </div>
        )}

        {/* View all */}
        <div className="mt-tk-8 text-center">
          <Link
            to="/journal"
            className="inline-block font-sans text-tk-md tracking-[0.25em] uppercase
                       text-tk-text-secondary border-b border-tk-border
                       px-tk-2 pb-tk-1 rounded-tk-xs
                       transition-colors duration-fast
                       hover:text-tk-text-primary active:text-tk-text-secondary
                       focus-visible:outline-2 focus-visible:outline-tk-text-primary
                       focus-visible:outline-offset-4"
          >
            View all entries
          </Link>
        </div>
      </div>
    </section>
  );
}
