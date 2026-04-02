import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function Journal() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('date_traveled', { ascending: false });
      return data || [];
    },
    initialData: [],
  });

  return (
    <div className="pt-28 pb-24 px-6 md:px-16">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">
            The Journal
          </h1>
          <p className="font-serif text-lg text-muted-foreground mt-4 max-w-lg">
            Dispatches from the edges of the map—slow travel, quiet observation, and the stories that unfold between destinations.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-16">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-2/5 aspect-[3/2] bg-muted rounded" />
                <div className="flex-1 space-y-4 py-4">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="font-serif text-muted-foreground text-center py-24">
            No dispatches yet. The journey begins soon.
          </p>
        ) : (
          <div className="space-y-20">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to={`/journal/${post.slug || post.id}`} className="group flex flex-col md:flex-row gap-8 md:gap-12">
                  <div className="w-full md:w-2/5 aspect-[3/2] overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-center py-2">
                    <div className="flex items-center gap-4 mb-4">
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
                    </div>

                    <h2 className="font-sans text-2xl md:text-3xl font-light tracking-[-0.01em] leading-tight group-hover:text-accent transition-colors duration-500 mb-4">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="font-serif text-base text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center gap-4">
                      {post.date_traveled && (
                        <span className="font-sans text-xs text-accent">
                          {format(new Date(post.date_traveled), 'MMMM d, yyyy')}
                        </span>
                      )}
                      <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground/50 group-hover:text-foreground transition-colors">
                        Read →
                      </span>
                    </div>
                  </div>
                </Link>

                {i < posts.length - 1 && <div className="w-full h-px bg-border mt-20" />}
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
