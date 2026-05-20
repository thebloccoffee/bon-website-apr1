import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

function getEmbedUrl(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export default function PortfolioPreview({ projects }) {
  const [selected, setSelected] = useState(null);

  if (!projects || projects.length === 0) return null;

  return (
    <section className="py-24 md:py-32 bg-card text-foreground">
      <div className="px-6 md:px-16 mb-16">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <div className="w-12 h-px bg-primary-foreground/30" />
          <span className="font-sans text-xs tracking-[0.3em] uppercase text-foreground/60">
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
              className="group relative w-[80vw] md:w-[55vw] lg:w-[40vw] flex-shrink-0 cursor-pointer"
              onClick={() => setSelected(project)}
            >
              <div className="aspect-[21/9] overflow-hidden">
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-white/0 group-hover:border-white/60 flex items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white/80 ml-1" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <h3 className="font-sans text-sm font-light tracking-wide text-foreground">
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className="font-sans text-xs text-foreground/40 mt-1">
                      {project.location}
                    </p>
                  )}
                </div>
                {project.year && (
                  <span className="font-sans text-xs text-foreground/30">
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
            className="font-sans text-xs tracking-[0.25em] uppercase text-foreground/50 hover:text-foreground transition-colors duration-300 border-b border-primary-foreground/20 pb-1"
          >
            View full reel
          </Link>
        </div>
      </div>

      {/* Video modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-black rounded overflow-hidden mb-6">
                {selected.video_url ? (
                  <iframe
                    src={getEmbedUrl(selected.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <img src={selected.thumbnail} alt={selected.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-white">
                <h2 className="font-sans text-2xl font-light">{selected.title}</h2>
                <div className="flex items-center gap-4 mt-2">
                  {selected.location && <span className="font-sans text-xs text-white/40">{selected.location}</span>}
                  {selected.year && <span className="font-sans text-xs text-white/40">{selected.year}</span>}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 md:top-6 md:right-6 font-sans text-xs text-white/50 tracking-[0.2em] uppercase hover:text-white transition-colors bg-black/40 px-3 py-2 rounded"
              >
                Close ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
