import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HERO_IMAGE = '/hero.jpg';

export default function HeroSection() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt="Jon Bon standing on a frozen lake in Banff"
          className="w-full h-full object-cover object-[65%_center] md:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-tk-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="font-sans font-light text-white text-tk-display tracking-[-0.02em]">
            Jon Bon
          </h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-tk-6"
          >
            <p className="font-sans text-white/70 text-tk-xs md:text-tk-md tracking-[0.25em] md:tracking-[0.4em] uppercase">
              Travel narratives &amp; cinematic storytelling
            </p>
          </motion.div>
        </motion.div>

        {/* Corner navigation hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-tk-8 left-0 right-0 flex justify-center"
        >
          <Link
            to="/journal"
            className="font-sans text-white/60 text-tk-md tracking-[0.3em] uppercase
                       px-tk-4 py-tk-3 rounded-tk-xs
                       transition-colors duration-normal
                       hover:text-white active:text-white/80
                       focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Explore the journal ↓
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
