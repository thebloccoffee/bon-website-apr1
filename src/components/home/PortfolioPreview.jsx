import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const closeRef = useRef(null);
  const lastTriggerRef = useRef(null);

  const open = useCallback((project, event) => {
    lastTriggerRef.current = event.currentTarget;
    setSelected(project);
  }, []);

  const close = useCallback(() => {
    setSelected(null);
    // Return focus to the card that opened the dialog.
    lastTriggerRef.current?.focus();
  }, []);

  // Escape closes the dialog; body scroll is locked while it is open.
  useEffect(() => {
    if (!selected) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected, close]);

  if (!projects || projects.length === 0) return null;

  return (
    <section
      className="py-24 md:py-32 bg-card text-foreground"
      aria-labelledby="selected-works-heading"
    >
      <div className="px-tk-6 md:px-16 mb-tk-8">
        <div className="max-w-6xl mx-auto flex items-center gap-tk-6">
          <div className="w-12 h-px bg-tk-border" />
          <h2
            id="selected-works-heading"
            className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary"
          >
            Selected works
          </h2>
        </div>
      </div>

      {/* Horizontal filmstrip — scrolls on its own axis, page never does */}
      <div className="filmstrip-scroll overflow-x-auto px-tk-6 md:px-16">
        <ul className="flex gap-tk-6 md:gap-tk-8 list-none m-0 p-0" style={{ width: 'max-content' }}>
          {projects.map((project, i) => (
            <motion.li
              key={project.id}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="w-[80vw] md:w-[55vw] lg:w-[40vw] flex-shrink-0"
            >
              <button
                type="button"
                onClick={(e) => open(project, e)}
                aria-haspopup="dialog"
                className="group relative block w-full text-left rounded-tk-xs
                           transition-transform duration-fast active:translate-y-px
                           focus-visible:outline-2 focus-visible:outline-tk-text-primary
                           focus-visible:outline-offset-4"
              >
                <span className="sr-only">Play {project.title}</span>
                <div className="aspect-[21/9] overflow-hidden rounded-tk-xs bg-tk-surface-raised">
                  <img
                    src={project.thumbnail}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover
                               transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20
                               transition-colors duration-normal flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="w-16 h-16 rounded-tk-pill border border-white/0
                                    group-hover:border-white/60 group-focus-visible:border-white/60
                                    flex items-center justify-center
                                    transition-all duration-normal
                                    opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                                    scale-75 group-hover:scale-100 group-focus-visible:scale-100">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent
                                      border-b-[8px] border-b-transparent
                                      border-l-[14px] border-l-white/80 ml-tk-1" />
                    </div>
                  </div>
                </div>
                <div className="mt-tk-5 flex items-start justify-between gap-tk-4">
                  <div>
                    <h3 className="font-sans text-tk-xl font-light tracking-wide text-tk-text-primary">
                      {project.title}
                    </h3>
                    {project.location && (
                      <p className="font-sans text-tk-md text-tk-text-tertiary mt-tk-1">
                        {project.location}
                      </p>
                    )}
                  </div>
                  {project.year && (
                    <span className="font-sans text-tk-md text-tk-text-tertiary shrink-0">
                      {project.year}
                    </span>
                  )}
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="px-tk-6 md:px-16 mt-tk-8">
        <div className="max-w-6xl mx-auto text-center">
          <Link
            to="/portfolio"
            className="inline-block font-sans text-tk-md tracking-[0.25em] uppercase
                       text-tk-text-secondary border-b border-tk-border
                       px-tk-2 pb-tk-1 rounded-tk-xs
                       transition-colors duration-fast
                       hover:text-tk-text-primary active:text-tk-text-secondary
                       focus-visible:outline-2 focus-visible:outline-tk-text-primary
                       focus-visible:outline-offset-4"
          >
            View full reel
          </Link>
        </div>
      </div>

      {/* Video dialog */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-tk-5 md:p-tk-6"
            onClick={close}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={selected.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-black rounded-tk-xs overflow-hidden mb-tk-6">
                {selected.video_url ? (
                  <iframe
                    src={getEmbedUrl(selected.video_url)}
                    title={selected.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <img
                    src={selected.thumbnail}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="text-white">
                <h3 className="font-sans text-tk-4xl font-light">{selected.title}</h3>
                <div className="flex items-center gap-tk-4 mt-tk-2">
                  {selected.location && (
                    <span className="font-sans text-tk-md text-white/60">{selected.location}</span>
                  )}
                  {selected.year && (
                    <span className="font-sans text-tk-md text-white/60">{selected.year}</span>
                  )}
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="absolute top-tk-3 right-tk-3 md:top-tk-6 md:right-tk-6
                           font-sans text-tk-md text-white/70 tracking-[0.2em] uppercase
                           bg-black/40 px-tk-4 py-tk-3 rounded-tk-xs
                           transition-colors duration-fast
                           hover:text-white active:text-white/70
                           focus-visible:outline-2 focus-visible:outline-white
                           focus-visible:outline-offset-2"
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
