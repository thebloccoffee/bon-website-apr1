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
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="font-sans font-light text-white text-[8vw] md:text-[5vw] leading-[1.1] tracking-[-0.02em]">
            Jon Bon
          </h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-8"
          >
            <p className="font-sans text-white/70 text-xs tracking-[0.4em] uppercase">
              Travel narratives & cinematic storytelling
            </p>
          </motion.div>
        </motion.div>

        {/* Corner navigation hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-0 right-0 flex justify-center"
        >
          <Link
            to="/journal"
            className="font-sans text-white/50 text-xs tracking-[0.3em] uppercase hover:text-white/80 transition-colors duration-500"
          >
            Explore the journal ↓
          </Link>
        </motion.div>
      </div>
    </section>
  );
}