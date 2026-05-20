import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CONTINENTS = ['All', 'Asia', 'Europe', 'Americas', 'Africa', 'Oceania'];

export default function Destinations() {
  const [activeContinent, setActiveContinent] = useState('All');

  const { data: destinations, isLoading } = useQuery({
    queryKey: ['destinations-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('destinations')
        .select('*')
        .eq('status', 'published')
        .order('order', { ascending: true });
      return data || [];
    },
    initialData: [],
  });

  const featured = destinations.filter((d) => d.featured).slice(0, 3);
  const continentsPresent = ['All', ...new Set(destinations.map((d) => d.continent))];

  const filtered =
    activeContinent === 'All'
      ? destinations
      : destinations.filter((d) => d.continent === activeContinent);

  const byContinent = continentsPresent
    .filter((c) => c !== 'All')
    .map((c) => ({ continent: c, items: destinations.filter((d) => d.continent === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="pt-28 pb-24">

      {/* PAGE HEADER */}
      <div className="px-6 md:px-16 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-accent mb-4">Destinations</p>
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1] mb-4">
            Where To Next?
          </h1>
          <p className="font-serif text-lg text-muted-foreground max-w-lg">
            Every place I've filmed, explored, and gotten completely lost in.
          </p>
        </motion.div>
      </div>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="px-6 md:px-16 mb-24">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-8">
            Top Picks
          </p>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map((dest, i) => (
                <FeaturedCard key={dest.id} dest={dest} index={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* DIVIDER */}
      <div className="w-full h-px bg-border mb-24" />

      {/* ALL DESTINATIONS + FILTER */}
      <section className="px-6 md:px-16 mb-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">Browse</p>
            <h2 className="font-sans text-2xl md:text-3xl font-light tracking-[-0.02em]">
              All Destinations
            </h2>
          </div>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {continentsPresent.map((c) => (
              <button
                key={c}
                onClick={() => setActiveContinent(c)}
                className={`font-sans text-xs tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-300 ${
                  activeContinent === c
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <DestGridSkeleton />
        ) : filtered.length === 0 ? (
          <p className="font-serif text-muted-foreground text-center py-24">
            No destinations here yet. Check back soon.
          </p>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((dest, i) => (
                <DestCard key={dest.id} dest={dest} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* DIVIDER */}
      <div className="w-full h-px bg-border mb-24" />

      {/* BY CONTINENT */}
      {byContinent.length > 0 && (
        <section className="px-6 md:px-16">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-12">
            Explore by Region
          </p>
          <div className="space-y-20">
            {byContinent.map(({ continent, items }) => (
              <div key={continent}>
                <div className="flex items-baseline gap-6 mb-8 pb-4 border-b border-border">
                  <h2 className="font-sans text-xl md:text-2xl font-light tracking-[-0.02em]">
                    {continent}
                  </h2>
                  <span className="font-sans text-xs text-muted-foreground">
                    {items.length} destination{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                  {items.map((dest, i) => (
                    <DestCard key={dest.id} dest={dest} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Featured Card ─────────────────────────────────────────────────────────── */
function FeaturedCard({ dest, index }) {
  const Tag = dest.href && dest.href !== '#' ? 'a' : 'div';
  const props = dest.href && dest.href !== '#'
    ? { href: dest.href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tag
        {...props}
        className="group block relative overflow-hidden aspect-[3/4] cursor-pointer"
      >
        {dest.cover_image ? (
          <img
            src={dest.cover_image}
            alt={dest.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-white/60 mb-2">
            {dest.continent}
          </p>
          <h3 className="font-sans text-2xl md:text-3xl font-light text-white tracking-[-0.01em] leading-tight mb-2">
            {dest.name}
          </h3>
          {dest.tagline && (
            <p className="font-serif text-sm text-white/70 leading-relaxed">
              {dest.tagline}
            </p>
          )}
        </div>
      </Tag>
    </motion.div>
  );
}

/* ── Destination Card ──────────────────────────────────────────────────────── */
function DestCard({ dest, index }) {
  const Tag = dest.href && dest.href !== '#' ? 'a' : 'div';
  const props = dest.href && dest.href !== '#'
    ? { href: dest.href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      layout
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Tag {...props} className="group block cursor-pointer">
        <div className="aspect-[4/3] overflow-hidden mb-5">
          {dest.cover_image ? (
            <img
              src={dest.cover_image}
              alt={dest.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="font-sans text-xs text-muted-foreground tracking-widest uppercase">
                {dest.name}
              </span>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground">
              {dest.continent}
            </span>
            {dest.region && (
              <>
                <span className="text-accent">·</span>
                <span className="font-sans text-xs text-accent">{dest.region}</span>
              </>
            )}
          </div>
          <h3 className="font-sans text-xl md:text-2xl font-light tracking-[-0.01em] group-hover:text-accent transition-colors duration-500 mb-2">
            {dest.name}
          </h3>
          {dest.description && (
            <p className="font-serif text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              {dest.description}
            </p>
          )}
          {dest.tags && dest.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dest.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-sans text-xs tracking-[0.1em] uppercase border border-border px-2 py-0.5 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Tag>
    </motion.div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */
function DestGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="animate-pulse space-y-4">
          <div className="aspect-[4/3] bg-muted" />
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-5 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      ))}
    </div>
  );
}
