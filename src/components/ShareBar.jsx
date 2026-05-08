import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Check } from 'lucide-react';

const IGModal = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="relative bg-[#111] border border-white/10 rounded-2xl p-7 max-w-sm w-full text-center">
      <button onClick={onClose} className="absolute top-3 right-4 text-white/40 hover:text-white text-lg">✕</button>
      <svg className="mx-auto mb-3 w-9 h-9" viewBox="0 0 24 24" fill="url(#igGrad2)">
        <defs>
          <linearGradient id="igGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
      <h3 className="font-semibold text-sm mb-2">Share to Instagram Story</h3>
      <p className="text-xs text-white/50 mb-4 leading-relaxed">
        Instagram doesn't support direct web sharing. Copy the link, open Instagram, create a Story, and add a <strong className="text-white/70">Link sticker</strong>.
      </p>
      <div className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white/40 break-all mb-4 select-all">{url}</div>
      <div className="flex gap-2 justify-center">
        <CopyUrlBtn url={url} />
        <a
          href="https://www.instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-4 py-2 rounded-lg font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
        >
          Open Instagram
        </a>
      </div>
    </div>
  </div>
);

const CopyUrlBtn = ({ url }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="text-xs px-4 py-2 rounded-lg border border-white/15 text-white/60 hover:text-white transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy Link'}
    </button>
  );
};

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12.004 0C5.372 0 0 5.373 0 12c0 2.113.554 4.095 1.522 5.813L.057 23.5l5.822-1.527A11.946 11.946 0 0012.004 24C18.636 24 24 18.627 24 12S18.636 0 12.004 0z" />
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const PLATFORMS = [
  {
    key: 'twitter',
    label: 'X / Twitter',
    icon: TwitterIcon,
    getUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: FacebookIcon,
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    getUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
  },
  {
    key: 'pinterest',
    label: 'Pinterest',
    icon: PinterestIcon,
    getUrl: (url, title, image) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}&media=${encodeURIComponent(image || '')}`,
  },
];

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export default function ShareBar({ title, image }) {
  const [copied, setCopied] = useState(false);
  const [igModal, setIgModal] = useState(false);
  const url = window.location.href;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstagram = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      setIgModal(true);
    }
  };

  return (
    <div className="mt-16 pt-8 border-t border-border">
      {igModal && <IGModal url={url} onClose={() => setIgModal(false)} />}
      <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-6">
        Share this dispatch
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        {PLATFORMS.map(({ key, label, icon: Icon, getUrl }) => (
          <a
            key={key}
            href={getUrl(url, title, image)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${label}`}
            className="group flex items-center gap-2 font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground border border-border px-4 py-2.5 hover:border-foreground hover:text-foreground transition-all duration-300"
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </a>
        ))}

        {/* Instagram Story */}
        <button
          onClick={handleInstagram}
          title="Share to Instagram Story"
          className="group flex items-center gap-2 font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground border border-border px-4 py-2.5 hover:border-foreground hover:text-foreground transition-all duration-300"
        >
          <InstagramIcon />
          <span className="hidden sm:inline">Instagram</span>
        </button>

        {/* Copy link */}
        <button
          onClick={handleCopy}
          title="Copy link"
          className="group flex items-center gap-2 font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground border border-border px-4 py-2.5 hover:border-foreground hover:text-foreground transition-all duration-300"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-foreground"
              >
                <Check size={14} />
                <span className="hidden sm:inline">Copied</span>
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Link2 size={14} />
                <span className="hidden sm:inline">Copy link</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}