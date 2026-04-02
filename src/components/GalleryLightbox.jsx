import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GalleryLightbox({ images = [], captions = [] }) {
  const [selected, setSelected] = useState(null);

  const open = (i) => setSelected(i);
  const close = () => setSelected(null);
  const prev = () => setSelected((i) => (i - 1 + images.length) % images.length);
  const next = () => setSelected((i) => (i + 1) % images.length);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return (
    <>
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((url, i) => (
          <div
            key={i}
            className="aspect-[3/2] overflow-hidden cursor-zoom-in group relative"
            onClick={() => open(i)}
          >
            <img
              src={url}
              alt={captions[i] || ''}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {captions[i] && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="font-serif text-white/80 text-xs">{captions[i]}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={close}
          >
            {/* Close */}
            <button
              onClick={close}
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-10"
            >
              <X size={24} />
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 md:left-8 text-white/60 hover:text-white transition-colors z-10"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {/* Main content */}
            <motion.div
              key={selected}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col md:flex-row items-center gap-8 max-w-6xl w-full px-16 md:px-24"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <img
                  src={images[selected]}
                  alt={captions[selected] || ''}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              </div>

              {/* Caption */}
              {captions[selected] && (
                <div className="md:w-56 shrink-0">
                  <div className="w-8 h-px bg-white/20 mb-4" />
                  <p className="font-serif text-white/70 text-sm leading-relaxed">
                    {captions[selected]}
                  </p>
                  <p className="font-sans text-white/30 text-xs mt-4 tracking-widest uppercase">
                    {selected + 1} / {images.length}
                  </p>
                </div>
              )}
              {!captions[selected] && (
                <p className="font-sans text-white/30 text-xs tracking-widest uppercase md:w-16 shrink-0">
                  {selected + 1} / {images.length}
                </p>
              )}
            </motion.div>

            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 md:right-8 text-white/60 hover:text-white transition-colors z-10"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
