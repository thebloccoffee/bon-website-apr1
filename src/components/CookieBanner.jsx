import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable — don't nag
      return undefined;
    }
    if (stored) return undefined;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-live="polite"
          aria-label="Cookie notice"
          className="fixed bottom-4 inset-x-4 md:inset-x-auto md:left-6 md:bottom-6 md:max-w-sm z-[60] bg-card text-card-foreground border border-border shadow-xl p-5"
        >
          <p className="font-serif text-sm leading-relaxed text-muted-foreground">
            This site uses a lightweight analytics tracker (Metricool) to understand visits.
            No ads, no data sold.
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="font-sans text-xs tracking-[0.25em] uppercase border border-foreground px-6 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
