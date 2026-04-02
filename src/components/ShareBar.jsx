import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Check } from 'lucide-react';

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

export default function ShareBar({ title, image }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-16 pt-8 border-t border-border">
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