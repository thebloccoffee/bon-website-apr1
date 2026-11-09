import React from 'react';

/**
 * <img> with sane performance defaults.
 *
 * - width and height are required so the browser reserves space (no layout shift).
 * - alt is required. Pass alt="" for decorative images.
 * - Lazy + async decoding by default. `priority` switches to eager + high
 *   fetch priority for the LCP image (hero, first card).
 * - Supabase public storage URLs (/storage/v1/object/public/...) are passed
 *   through untouched. Image transforms (/render/image/) need a paid plan,
 *   so we never rewrite to them.
 */
export default function SmartImage({ src, alt, width, height, priority = false, loading, sizes, srcSet, className, ...rest }) {
  if (import.meta.env.DEV) {
    if (alt === undefined) console.warn('[SmartImage] missing alt (use alt="" for decorative images):', src);
    if (!width || !height) console.warn('[SmartImage] width and height are required:', src);
  }

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      sizes={srcSet ? sizes : undefined}
      srcSet={srcSet}
      loading={loading || (priority ? 'eager' : 'lazy')}
      decoding={priority ? 'auto' : 'async'}
      // React 18 only passes the lowercase attribute through to the DOM.
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={className}
      {...rest}
    />
  );
}
