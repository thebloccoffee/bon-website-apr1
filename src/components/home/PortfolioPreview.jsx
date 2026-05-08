import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function PortfolioPreview({ projects }) {
  if (!projects || projects.length === 0) return null;

  return (
    <section className="py-24 md:py-32 bg-foreground text-primary-foreground">
      <div className="px-6 md:px-16 mb-16">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <div className="w-12 h-px bg-primary-foreground/30" />
          <span className="font-sans text-xs tracking-[0.3em] uppercase text-primary-foreground/60">
            Selected Works
          </span>
        </div>
      </div>

      {/* Horizontal filmstrip */}
      <div className="filmstrip-scroll overflow-x-auto px-6 md:px-16">
        <div className="flex gap-6 md:gap-8" style={{ width: 'max-content' }}>
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="group relative w-[80vw] md:w-[55vw] lg:w-[40vw] flex-shrink-0"
            >
              <div className="aspect-[21/9] overflow-hidden">
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-white/0 group-hover:border-white/60 flex items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white/80 ml-1" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <h3 className="font-sans text-sm font-light tracking-wide text-primary-foreground">
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className="font-sans text-xs text-primary-foreground/40 mt-1">
                      {project.location}
                    </p>
                  )}
                </div>
                {project.year && (
                  <span className="font-sans text-xs text-primary-foreground/30">
                    {project.year}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-16 mt-16">
        <div className="max-w-6xl mx-auto text-center">
          <Link
            to="/portfolio"
            className="font-sans text-xs tracking-[0.25em] uppercase text-primary-foreground/50 hover:text-primary-foreground transition-colors duration-300 border-b border-primary-foreground/20 pb-1"
          >
            View full reel
          </Link>
        </div>
      </div>
    </section>
  );
}