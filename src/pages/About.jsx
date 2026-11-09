import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BRANDS } from '@/lib/brands';
import { BonpointsWordmark } from '@/components/shared/BrandDoor';

// Bio copy uses confirmed facts only. Longer bio, portrait, press and collab
// details are Jon-to-fill (see docs/handoff/agent-a.md).
export default function About() {
  return (
    <div className="pt-28 pb-24 px-tk-6 md:px-16 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <p className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary mb-tk-5">About</p>
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1] mb-tk-6">
            Jon Bon Tabas
          </h1>
          <p className="font-serif text-tk-3xl text-tk-text-secondary leading-relaxed max-w-2xl">
            I&apos;m a Filipino-Canadian creator based in Vancouver. I run two channels: jooonbon for travel films
            and bon.points for credit cards and points.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-tk-6 md:gap-tk-8">
          <BrandBlock brand="jooonbon" title={<span className="font-sans font-light">jooonbon</span>}>
            Travel filmmaking. I recreate famous movie scenes in the places they were filmed.
          </BrandBlock>
          <div data-brand="bonpoints" className="h-full">
            <BrandBlock brand="bonpoints" title={<BonpointsWordmark />} glass>
              I&apos;m an accountant who travels on points. I cover credit cards, finance and travel tips,
              mostly Canadian Amex Membership Rewards.
            </BrandBlock>
          </div>
        </div>

        <section className="mt-20 md:mt-28 border-t border-tk-border pt-tk-8" aria-labelledby="collab-heading">
          <h2 id="collab-heading" className="font-sans text-tk-4xl font-light tracking-[-0.02em] mb-tk-5">
            Collabs and client work
          </h2>
          <p className="font-serif text-tk-2xl text-tk-text-secondary leading-relaxed max-w-2xl mb-tk-7">
            For brand work, client films or press, send a note through the contact form. Past client work is in the
            portfolio.
          </p>
          <div className="flex flex-wrap gap-tk-7">
            <Link to="/contact" className="font-sans text-tk-md tracking-[0.3em] uppercase text-foreground border border-foreground px-10 py-4 hover:bg-foreground hover:text-background transition-all duration-normal">
              Get in touch
            </Link>
            <Link to="/portfolio" className="self-center font-sans text-tk-md tracking-[0.25em] uppercase text-tk-text-secondary border-b border-tk-border pb-tk-1 hover:text-tk-text-primary transition-colors">
              Portfolio
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function BrandBlock({ brand, title, glass = false, children }) {
  const b = BRANDS[brand];
  return (
    <div className={`h-full flex flex-col rounded-tk-xs p-tk-7 md:p-tk-8 ${glass ? 'bg-background bp-glass' : 'bg-card border border-tk-border'}`}>
      <p className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary mb-tk-4">{b.tagline}</p>
      <h2 className="text-4xl leading-none mb-tk-5 text-tk-text-primary">{title}</h2>
      <p className={`${glass ? 'font-sans' : 'font-serif'} text-tk-xl text-tk-text-secondary leading-relaxed mb-tk-6`}>
        {children}
      </p>
      <div className="mt-auto flex flex-wrap gap-tk-6 font-sans text-tk-md tracking-[0.2em] uppercase">
        <Link to={b.path} className="text-tk-text-primary border-b border-tk-border pb-tk-1 hover:border-tk-text-primary transition-colors">
          Visit {b.name}
        </Link>
        <a href={b.youtube} target="_blank" rel="noopener noreferrer" className="text-tk-text-tertiary hover:text-tk-text-primary transition-colors">YouTube</a>
        <a href={b.instagram} target="_blank" rel="noopener noreferrer" className="text-tk-text-tertiary hover:text-tk-text-primary transition-colors">Instagram</a>
      </div>
    </div>
  );
}
