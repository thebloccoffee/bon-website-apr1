import React, { useState, useCallback } from 'react';
import { Play } from 'lucide-react';

const EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

// One preconnect per page, added on first hover/focus so nothing from
// YouTube is fetched until the visitor shows intent.
let warmed = false;
function warmConnections() {
  if (warmed || typeof document === 'undefined') return;
  warmed = true;
  [EMBED_ORIGIN, 'https://www.google.com'].forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = '';
    document.head.appendChild(link);
  });
}

/**
 * Click-to-load YouTube player. Shows the i.ytimg.com thumbnail and a play
 * button; the youtube-nocookie iframe (and all YouTube JS) loads only after
 * the click.
 *
 * Props: youtubeId, title, format ('long' | 'short'), priority, sizes, className
 */
export default function YouTubeFacade({
  youtubeId,
  title = 'YouTube video',
  format = 'long',
  priority = false,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  className = '',
}) {
  const [playing, setPlaying] = useState(false);
  // maxresdefault does not exist for every video. YouTube then serves a
  // 120x90 grey placeholder, so drop the srcset and stay on hqdefault.
  const [hasMaxRes, setHasMaxRes] = useState(format !== 'short');

  const onThumbLoad = useCallback((e) => {
    if (e.currentTarget.naturalWidth <= 120) setHasMaxRes(false);
  }, []);
  const onThumbError = useCallback(() => setHasMaxRes(false), []);

  if (!youtubeId || !ID_RE.test(youtubeId)) return null;

  const isShort = format === 'short';
  const aspect = isShort ? 'aspect-[9/16]' : 'aspect-video';
  const hq = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const srcSet = hasMaxRes
    ? `${hq} 480w, https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg 1280w`
    : undefined;

  if (playing) {
    const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
    return (
      <div className={`relative w-full overflow-hidden bg-tk-surface-muted ${aspect} ${className}`}>
        <iframe
          src={`${EMBED_ORIGIN}/embed/${youtubeId}?${params}`}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      onPointerEnter={warmConnections}
      onFocus={warmConnections}
      aria-label={`Play video: ${title}`}
      className={`group relative block w-full overflow-hidden bg-tk-surface-raised ${aspect} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${className}`}
    >
      <img
        src={hq}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt=""
        width={480}
        height={360}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchpriority: 'high' } : {})}
        onLoad={onThumbLoad}
        onError={onThumbError}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-tk-pill bg-background/70 text-foreground backdrop-blur-sm transition-transform duration-fast group-hover:scale-110"
      >
        <Play size={22} className="ml-0.5" fill="currentColor" />
      </span>
    </button>
  );
}
