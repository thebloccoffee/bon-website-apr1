import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { COUNTRIES } from '@/lib/places';

// Personal bio. Facts only from Jon: Filipino, based in Vancouver, travel
// films, recreates movie scenes where they were shot. Countries come from
// the map so the list stays true as trips are added.
const filmed = COUNTRIES.filter((c) => c.status !== 'soon' && c.slug !== 'canada').map((c) => (c.slug === 'usa' ? 'New York' : c.slug === 'philippines' ? 'the Philippines' : c.name));
const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] || '');

export default function About() {
  return (
    <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl"
      >
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>About</p>
        <h1 className="text-5xl md:text-7xl leading-[1.02] mb-10">Jon Bon Tabas</h1>

        <div className="space-y-6 text-xl md:text-2xl leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          <p style={{ color: 'var(--color-text-primary)' }}>
            I&apos;m a Filipino filmmaker based in Vancouver, and I want to see as much of the world as I can.
          </p>
          <p>
            I film my trips the way I&apos;d want to watch them in a movie. When a place has been in a film I love, I go
            to the spot where the scene was shot and recreate it.
          </p>
          <p>
            So far that has taken me to {list(filmed)}, plus a lot of British Columbia close to home. Every place
            I&apos;ve filmed is on <Link to="/" className="underline underline-offset-4" style={{ color: 'var(--color-text-primary)' }}>the globe</Link>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-12">
          <Link to="/videos" className="sn-btn inline-flex" style={{ background: 'var(--color-text-primary)', color: 'var(--color-surface-muted)' }}>Watch the films</Link>
          <a href="https://youtube.com/jonbontabas" target="_blank" rel="noopener noreferrer" className="sn-btn is-ghost inline-flex border">YouTube ↗</a>
        </div>
      </motion.div>

      <section className="max-w-3xl mt-24 pt-10 border-t" style={{ borderColor: 'var(--color-border-default)' }} aria-labelledby="collab-heading">
        <h2 id="collab-heading" className="text-3xl mb-4">Work with me</h2>
        <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          For brand work, client films or press, send me a note. Past client work is in the portfolio.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Link to="/contact" className="sn-btn inline-flex" style={{ background: 'var(--color-text-primary)', color: 'var(--color-surface-muted)' }}>Get in touch</Link>
          <Link to="/portfolio" className="underline underline-offset-4" style={{ color: 'var(--color-text-secondary)' }}>See the portfolio</Link>
        </div>
      </section>
    </div>
  );
}
