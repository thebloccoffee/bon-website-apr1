import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  STATIC_ROUTES,
  NOT_FOUND,
  SITE_NAME,
  matchRoute,
  formatTitle,
  canonicalUrl,
  absoluteUrl,
  normalizePath,
} from '@/lib/seo-routes';

/*
 * Client-side head updates for SPA navigation. The first page load already has
 * the right head from api/page.js; these keep it right as the user clicks around.
 *
 *   <RouteSeo />  mounted once in SiteLayout. Applies the static copy from
 *                 src/lib/seo-routes.js for the current path (section copy for
 *                 dynamic routes until the page supplies its own).
 *   <Seo ... />   rendered by a page that knows better, e.g. BlogPost once the
 *                 post has loaded. Wins over RouteSeo for that path.
 */

const overrides = new Map(); // pathname -> props from a page-level <Seo>
const initialPath = typeof window !== 'undefined' ? normalizePath(window.location.pathname) : null;
let navigated = false;

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === '') {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(items) {
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
  for (const data of items || []) {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  }
}

function applyHead({ title, description, image, type, noindex, canonical, jsonLd }) {
  const fullTitle = formatTitle(title);
  const desc = description || STATIC_ROUTES['/'].description;
  const img = absoluteUrl(image);
  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setCanonical(noindex ? null : canonical);
  setMeta('name', 'robots', noindex ? 'noindex, follow' : null);
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:type', type || 'website');
  setMeta('property', 'og:title', title || SITE_NAME);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', noindex ? null : canonical);
  setMeta('property', 'og:image', img);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title || SITE_NAME);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'twitter:image', img);
  if (jsonLd !== undefined) setJsonLd(jsonLd);
}

function routeHead(pathname) {
  const match = matchRoute(pathname);
  if (!match) return { ...NOT_FOUND, canonical: null };
  if (match.kind === 'static') {
    return { ...match.meta, canonical: canonicalUrl(match.path) };
  }
  // Dynamic route with no page override yet: section copy, this path's canonical.
  return { ...STATIC_ROUTES[match.section], canonical: canonicalUrl(`${match.section}/${match.slug}`) };
}

/** Mount once in SiteLayout. */
export function RouteSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = normalizePath(pathname);
    // "First" = still on the URL the server rendered (StrictMode-safe).
    if (path !== initialPath) navigated = true;
    const first = !navigated;
    if (overrides.has(path)) return;
    const match = matchRoute(path);
    // On the first load the server already wrote the head (including JSON-LD
    // built from the DB row). Don't replace it with generic section copy.
    if (first && match && match.kind !== 'static') return;
    // Server JSON-LD belongs to the first URL only; after navigation, drop it
    // (home gets its own back from the static index.html on a fresh load).
    applyHead({ ...routeHead(path), jsonLd: first ? undefined : [] });
  }, [pathname]);
  return null;
}

/**
 * Page-level head. Props: title (page name, site name is appended), description,
 * image (absolute or site-relative), type ('website' | 'article' | 'product'),
 * noindex, canonicalPath (defaults to the current path), jsonLd (array).
 */
export default function Seo({ title, description, image, type, noindex = false, canonicalPath, jsonLd }) {
  const { pathname } = useLocation();
  const path = normalizePath(pathname);
  const canonical = canonicalUrl(canonicalPath || path);
  const ld = jsonLd ? JSON.stringify(jsonLd) : undefined;

  useEffect(() => {
    const props = {
      title,
      description,
      image,
      type,
      noindex,
      canonical,
      jsonLd: ld ? JSON.parse(ld) : undefined,
    };
    overrides.set(path, props);
    applyHead(props);
    return () => {
      if (overrides.get(path) === props) overrides.delete(path);
    };
  }, [path, title, description, image, type, noindex, canonical, ld]);

  return null;
}
