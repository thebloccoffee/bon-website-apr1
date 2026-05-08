import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// Map location names → continent
const CONTINENT_MAP = {
  // Asia
  'Vietnam': 'Asia', 'Japan': 'Asia', 'Philippines': 'Asia', 'Thailand': 'Asia',
  'Indonesia': 'Asia', 'Bali': 'Asia', 'Cambodia': 'Asia', 'Laos': 'Asia',
  'Myanmar': 'Asia', 'Malaysia': 'Asia', 'Singapore': 'Asia', 'South Korea': 'Asia',
  'China': 'Asia', 'Taiwan': 'Asia', 'Nepal': 'Asia', 'India': 'Asia',
  'Sri Lanka': 'Asia', 'Hong Kong': 'Asia',
  // Europe
  'Portugal': 'Europe', 'Spain': 'Europe', 'France': 'Europe', 'Italy': 'Europe',
  'Norway': 'Europe', 'Sweden': 'Europe', 'Denmark': 'Europe', 'Iceland': 'Europe',
  'Germany': 'Europe', 'Netherlands': 'Europe', 'Greece': 'Europe', 'Croatia': 'Europe',
  'Czech Republic': 'Europe', 'Austria': 'Europe', 'Switzerland': 'Europe',
  'Poland': 'Europe', 'Hungary': 'Europe',
  // Americas
  'Canada': 'Americas', 'Quebec': 'Americas', 'Mexico': 'Americas', 'Peru': 'Americas',
  'Colombia': 'Americas', 'Brazil': 'Americas', 'Argentina': 'Americas',
  'Costa Rica': 'Americas', 'Cuba': 'Americas', 'USA': 'Americas',
  // Africa
  'Morocco': 'Africa', 'Egypt': 'Africa', 'South Africa': 'Africa', 'Kenya': 'Africa',
  'Tanzania': 'Africa', 'Ethiopia': 'Africa',
  // Oceania
  'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
};

function getContinent(location) {
  if (!location) return 'Other';
  // Try exact match first, then partial
  if (CONTINENT_MAP[location]) return CONTINENT_MAP[location];
  const key = Object.keys(CONTINENT_MAP).find((k) =>
    location.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CONTINENT_MAP[key] : 'Other';
}

export default function Journal() {
  const [activeDestination, setActiveDestination] = useState(null);
  const [activeContinent, setActiveContinent] = useState('All');

  const { data: posts, isLoading, isError } = useQuery({
    queryKey: ['blog-posts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,cover_image,location,coordinates,date_traveled,tags')
        .eq('status', 'published')
        .order('date_traveled', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    retry: 2,
  });

  // Build destination cards from unique locations in posts
  const destinations = useMemo(() => {
    const map = {};
    posts.forEach((post) => {
      const loc = post.location;
      if (!loc) return;
      if (!map[loc]) {
        map[loc] = { location: loc, continent: getContinent(loc), posts: [], coverImage: null };
      }
      map[loc].posts.push(post);
      if (!map[loc].coverImage && post.cover_image) {
        map[loc].coverImage = post.cover_image;
      }
    });
    return Object.values(map).sort((a, b) => b.posts.length - a.posts.length);
  }, [posts]);

  const continents = useMemo(() => {
    const set = new Set(destinations.map((d) => d.continent));
    return ['All', ...Array.from(set).filter((c) => c !== 'Other').sort(), ...(set.has('Other') ? ['Other'] : [])];
  }, [destinations]);

  const filteredDestinations = useMemo(() => {
    if (activeContinent === 'All') return destinations;
    return destinations.filter((d) => d.continent === activeContinent);
  }, [destinations, activeContinent]);

  const filteredPosts = useMemo(() => {
    if (activeDestination) return posts.filter((p) => p.location === activeDestination);
    if (activeContinent !== 'All') {
      return posts.filter((p) => getContinent(p.location) === activeContinent);
    }
    return posts;
  }, [posts, activeDestination, activeContinent]);

  const handleDestinationClick = (loc) => {
    if (activeDestination === loc) {
      setActiveDestination(null);
    } else {
      setActiveDestination(loc);
      setActiveContinent('All');
      // Scroll to posts
      setTimeout(() => {
        document.getElementById('posts-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleContinentClick = (continent) => {
    setActiveContinent(continent);
    setActiveDestination(null);
  };

  const clearFilter = () => {
    setActiveDestination(null);
    setActiveContinent('All');
  };

  return (
    <div className="pt-28 pb-24">

      {/* PAGE HEADER */}
      <div className="px-6 md:px-16 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">
            The Journal
          </h1>
          <p className="font-serif text-lg text-muted-foreground mt-4 max-w-lg">
            Dispatches from the edges of the map — slow travel, quiet observation, and the stories that unfold between destinations.
          </p>
        </motion.div>
      </div>

      {/* DESTINATIONS SECTION */}
      {!isLoading && destinations.length > 0 && (
        <section className="mb-16">
          {/* Continent filter pills */}
          <div className="px-6 md:px-16 mb-8 flex flex-wrap items-center gap-2 md:gap-3">
            <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground w-full md:w-auto mb-1 md:mb-0 md:mr-2">
              Browse by
            </span>
            {continents.map((c) => (
              <button
                key={c}
                onClick={() => handleContinentClick(c)}
                className={`font-sans text-xs tracking-[0.1em] md:tracking-[0.15em] uppercase px-3 md:px-4 py-2.5 md:py-2 border transition-all duration-300 ${
                  activeContinent === c && !activeDestination
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Destination cards — horizontal scroll on mobile, grid on desktop */}
          <div className="px-6 md:px-16">
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredDestinations.map((dest, i) => (
                  <motion.button
                    key={dest.location}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => handleDestinationClick(dest.location)}
                    className={`group relative text-left overflow-hidden aspect-[4/3] transition-all duration-500 ${
                      activeDestination === dest.location ? 'ring-2 ring-foreground' : ''
                    }`}
                  >
                    {dest.coverImage ? (
                      <img
                        src={dest.coverImage}
                        alt={dest.location}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="font-sans text-white text-xs font-light tracking-[-0.01em] leading-tight truncate">
                        {dest.location}
                      </p>
                      <p className="font-sans text-white/50 text-[10px] tracking-[0.1em] uppercase mt-0.5">
                        {dest.posts.length} {dest.posts.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>
      )}

      <div className="w-full h-px bg-border mb-16" />

      {/* POSTS SECTION */}
      <section id="posts-section" className="px-6 md:px-16">

        {/* Active filter label */}
        <div className="flex items-center justify-between mb-12">
          <div>
            {activeDestination ? (
              <div>
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-accent mb-1">
                  Destination
                </p>
                <h2 className="font-sans text-2xl md:text-3xl font-light tracking-[-0.02em]">
                  {activeDestination}
                </h2>
              </div>
            ) : activeContinent !== 'All' ? (
              <div>
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-accent mb-1">
                  Region
                </p>
                <h2 className="font-sans text-2xl md:text-3xl font-light tracking-[-0.02em]">
                  {activeContinent}
                </h2>
              </div>
            ) : (
              <h2 className="font-sans text-2xl md:text-3xl font-light tracking-[-0.02em]">
                All Entries
              </h2>
            )}
          </div>
          {(activeDestination || activeContinent !== 'All') && (
            <button
              onClick={clearFilter}
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear ×
            </button>
          )}
        </div>

        {/* Posts list */}
        {isLoading ? (
          <div className="space-y-16">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-2/5 aspect-[3/2] bg-muted" />
                <div className="flex-1 space-y-4 py-4">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="font-serif text-muted-foreground text-center py-24">
            Could not load entries. Check your connection and refresh.
          </p>
        ) : filteredPosts.length === 0 ? (
          <p className="font-serif text-muted-foreground text-center py-24">
            No entries for this destination yet.
          </p>
        ) : (
          <div className="space-y-20">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, i) => (
                <motion.article
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={`/journal/${post.slug || post.id}`}
                    className="group flex flex-col md:flex-row gap-8 md:gap-12"
                  >
                    <div className="w-full md:w-2/5 aspect-[3/2] overflow-hidden">
                      {post.cover_image ? (
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
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

                  {i < filteredPosts.length - 1 && (
                    <div className="w-full h-px bg-border mt-20" />
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
