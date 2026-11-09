import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'cookie_consent';
const ACCEPTED = 'accepted';
const DECLINED = 'declined';

const METRICOOL_SRC = 'https://tracker.metricool.com/resources/be.js';
const METRICOOL_HASH = 'fa9e7713158783b01bdad4ca2ebef935';

/*
 * Metricool's be.js sets no cookies or storage; it sends a tracking pixel with
 * the page URL, referrer and screen size. We still load it only after the
 * visitor accepts, so nothing goes to a third party without consent.
 * The old value 'dismissed' (pre-consent banner) counts as no answer.
 */
let metricoolLoaded = false;
export function loadMetricool() {
  if (metricoolLoaded || typeof document === 'undefined') return;
  metricoolLoaded = true;
  const s = document.createElement('script');
  s.src = METRICOOL_SRC;
  s.async = true;
  s.onload = () => {
    try {
      window.beTracker?.t({ hash: METRICOOL_HASH });
    } catch {
      // tracker failed; ignore
    }
  };
  document.head.appendChild(s);
}

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return undefined; // storage blocked
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

/** Clears the stored choice so the banner shows again (e.g. from the Privacy page). */
export function resetCookieConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('cookie-consent-reset'));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (stored === undefined) return undefined; // storage unavailable: no tracking, no nagging
    if (stored === ACCEPTED) {
      loadMetricool();
      return undefined;
    }
    let t;
    const show = () => { t = setTimeout(() => setVisible(true), 1200); };
    if (stored !== DECLINED) show();
    const onReset = () => setVisible(true);
    window.addEventListener('cookie-consent-reset', onReset);
    return () => {
      clearTimeout(t);
      window.removeEventListener('cookie-consent-reset', onReset);
    };
  }, []);

  const accept = () => {
    writeConsent(ACCEPTED);
    loadMetricool();
    setVisible(false);
  };

  const decline = () => {
    writeConsent(DECLINED);
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
          aria-label="Analytics consent"
          className="fixed bottom-3 inset-x-3 md:inset-x-auto md:right-4 md:left-auto md:bottom-4 md:max-w-[300px] z-[60] bg-card text-card-foreground border border-border shadow-xl p-4"
        >
          <p className="font-serif text-sm leading-relaxed text-muted-foreground">
            Can I count your visit with Metricool analytics? It sees the page you're on, where you came from and your
            screen size. No ads, and nothing is sold. <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={decline}
              className="font-sans text-xs tracking-[0.25em] uppercase border border-border px-4 py-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-all duration-300"
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={accept}
              className="font-sans text-xs tracking-[0.25em] uppercase border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
