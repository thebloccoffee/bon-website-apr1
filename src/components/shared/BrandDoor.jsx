import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BRANDS } from '@/lib/brands';

const BLURB = {
  jooonbon: 'Famous movie scenes, recreated in the places they were filmed.',
  bonpoints: 'An accountant who travels on points. Canadian cards, Amex Membership Rewards and how to use them.',
};

export function BonpointsWordmark({ className = '' }) {
  return (
    <span className={`font-sans tracking-[-0.02em] ${className}`}>
      <span className="font-semibold">bon</span>
      <span className="font-medium italic">.points</span>
    </span>
  );
}

// Big tile on Home linking to a brand page.
export default function BrandDoor({ brand, index = 0 }) {
  const b = BRANDS[brand];
  if (!b) return null;
  const isBp = brand === 'bonpoints';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      data-brand={isBp ? 'bonpoints' : 'jooonbon'}
      className="h-full"
    >
      <Link
        to={b.path}
        className={`group relative flex flex-col justify-between h-full min-h-[18rem] md:min-h-[24rem]
                    p-tk-7 md:p-12 rounded-tk-xs overflow-hidden
                    transition-colors duration-normal
                    focus-visible:outline-2 focus-visible:outline-tk-text-primary focus-visible:outline-offset-4
                    ${isBp ? 'bg-background text-foreground' : 'bg-card text-foreground border border-tk-border'}`}
      >
        {isBp && (
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-tk-pill bg-foreground/10 blur-3xl" aria-hidden="true" />
        )}
        <p className="relative font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary">
          {b.tagline}
        </p>
        <div className={`relative ${isBp ? 'bp-glass rounded-tk-xs p-tk-6 mt-tk-8' : 'mt-tk-8'}`}>
          <h3 className="text-4xl md:text-6xl leading-none mb-tk-5">
            {isBp ? (
              <BonpointsWordmark />
            ) : (
              <span className="font-sans font-light tracking-[-0.02em]">jooonbon</span>
            )}
          </h3>
          <p className={`${isBp ? 'font-sans' : 'font-serif'} text-tk-xl text-tk-text-secondary leading-relaxed max-w-md`}>
            {BLURB[brand]}
          </p>
          <span className="inline-block mt-tk-6 font-sans text-tk-md tracking-[0.25em] uppercase text-tk-text-primary border-b border-tk-border pb-tk-1 transition-colors duration-fast group-hover:border-tk-text-primary">
            Enter {b.name} →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
