// Shared SEO data for the browser (src/components/shared/Seo.jsx) and the
// Vercel functions (server-lib/seo.js -> api/page.js, api/sitemap.js).
// Keep this file plain ESM: no JSX, no "@/" aliases, no import.meta.env,
// and relative imports with explicit .js extensions so Node can load it.
import { BRANDS } from './brands.js';

export const SITE_URL = 'https://www.tabasjonbon.com';
export const SITE_NAME = 'Jon Bon Tabas';
export const DEFAULT_IMAGE = '/og-image.png';
export const PERSON_NAME = 'Jon Bon Tabas';

export const SAME_AS = [
  BRANDS.jooonbon.instagram,
  BRANDS.jooonbon.youtube,
  BRANDS.bonpoints.instagram,
  BRANDS.bonpoints.youtube,
];

// Static routes. Mirrors the route list in src/App.jsx.
// `title` is the page name; formatTitle() adds the site name.
// `sitemap` false keeps a route out of sitemap.xml.
export const STATIC_ROUTES = {
  '/': {
    title: 'Jon Bon Tabas',
    description:
      'Jon Bon Tabas (jooonbon) is a Filipino-Canadian travel filmmaker in Vancouver who recreates famous movie scenes where they were filmed. Travel films, client work and journal.',
    type: 'website',
    sitemap: { priority: '1.0', changefreq: 'weekly' },
  },
  '/bonpoints': {
    title: 'bon.points',
    description:
      'Credit cards, finance and travel tips from an accountant who travels on points, with a focus on Canadian Amex Membership Rewards.',
    sitemap: { priority: '0.9', changefreq: 'weekly' },
  },
  '/bonpoints/guides': {
    title: 'bon.points guides',
    description: 'Credit card, points and travel money guides from bon.points.',
    sitemap: { priority: '0.8', changefreq: 'weekly' },
  },
  '/bonpoints/videos': {
    title: 'bon.points videos',
    description: 'Credit card, points and travel money videos from bon.points.',
    sitemap: { priority: '0.7', changefreq: 'weekly' },
  },
  '/travel': {
    title: 'Travel destinations',
    description: 'Places Jon Bon Tabas has filmed and written about, with the stories and videos from each one.',
    sitemap: { priority: '0.8', changefreq: 'weekly' },
  },
  '/journal': {
    title: 'Journal',
    description: 'Travel stories and guides by Jon Bon Tabas.',
    sitemap: { priority: '0.9', changefreq: 'weekly' },
  },
  '/stories': {
    title: 'Stories',
    description: 'Travel films, journal posts and destinations by Jon Bon Tabas.',
    sitemap: { priority: '0.9', changefreq: 'weekly' },
  },
  '/videos': {
    title: 'Films',
    description: 'Travel films and shorts by jooonbon, Jon Bon Tabas.',
    sitemap: { priority: '0.8', changefreq: 'weekly' },
  },
  '/shop': {
    title: 'Shop',
    description: 'Digital products from Jon Bon Tabas, such as LUTs and presets.',
    sitemap: { priority: '0.8', changefreq: 'weekly' },
  },
  '/shop/thanks': {
    title: 'Thanks for your order',
    description: 'Your order is confirmed.',
    noindex: true,
    sitemap: false,
  },
  '/portfolio': {
    title: 'Work',
    description: 'Client video work by Jon Bon Tabas: event highlights, brand films and travel content. Available for bookings.',
    sitemap: { priority: '0.7', changefreq: 'monthly' },
  },
  '/about': {
    title: 'About Jon Bon Tabas',
    description:
      'Jon Bon Tabas is a Filipino-Canadian creator in Vancouver. He runs jooonbon, a travel film channel, and bon.points, a channel about credit cards and points.',
    sitemap: { priority: '0.7', changefreq: 'monthly' },
  },
  '/contact': {
    title: 'Contact',
    description: 'Send Jon Bon Tabas a message about a project or a collaboration.',
    sitemap: { priority: '0.5', changefreq: 'yearly' },
  },
  '/search': {
    title: 'Search',
    description: 'Search stories, videos and products on tabasjonbon.com.',
    noindex: true,
    sitemap: false,
  },
  '/privacy': {
    title: 'Privacy policy',
    description: 'How tabasjonbon.com collects and uses personal information.',
    sitemap: { priority: '0.2', changefreq: 'yearly' },
  },
  '/terms': {
    title: 'Terms of use',
    description: 'Terms of use for tabasjonbon.com and its shop.',
    sitemap: { priority: '0.2', changefreq: 'yearly' },
  },
  '/refunds': {
    title: 'Refund policy',
    description: 'Refund policy for digital products bought on tabasjonbon.com.',
    sitemap: { priority: '0.2', changefreq: 'yearly' },
  },
  '/disclosures': {
    title: 'Disclosures',
    description: 'Affiliate and sponsorship disclosures for jooonbon and bon.points.',
    sitemap: { priority: '0.2', changefreq: 'yearly' },
  },
  '/admin': {
    title: 'Admin',
    description: 'Site admin.',
    noindex: true,
    sitemap: false,
  },
};

// Dynamic routes. `section` is the static parent used for breadcrumbs and as
// the fallback copy while (or if) the row can't be loaded.
export const DYNAMIC_ROUTES = [
  { kind: 'post', prefix: '/journal/', section: '/journal' },
  { kind: 'post', prefix: '/bonpoints/guides/', section: '/bonpoints/guides' },
  { kind: 'product', prefix: '/shop/', section: '/shop' },
  { kind: 'destination', prefix: '/travel/', section: '/travel' },
];

export const NOT_FOUND = {
  title: 'Page not found',
  description: 'This page does not exist.',
  noindex: true,
};

export function formatTitle(title) {
  if (!title || title === SITE_NAME) return SITE_NAME;
  return `${title} | ${SITE_NAME}`;
}

/** "/Journal/x/?a=1" -> "/journal/x" style normalisation (case kept, slash and query dropped). */
export function normalizePath(path) {
  let p = String(path || '/').split(/[?#]/)[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

export function canonicalUrl(path) {
  const p = normalizePath(path);
  return p === '/' ? SITE_URL : `${SITE_URL}${p}`;
}

export function absoluteUrl(url) {
  if (!url) return `${SITE_URL}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Match a pathname against the route table.
 * Returns { kind: 'static', path, meta } | { kind: 'post'|'product'|'destination', slug, section } | null
 */
export function matchRoute(path) {
  const p = normalizePath(path);
  // react-router matches case-insensitively, so the head should too.
  const lower = p.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(STATIC_ROUTES, lower)) {
    return { kind: 'static', path: lower, meta: STATIC_ROUTES[lower] };
  }
  for (const r of DYNAMIC_ROUTES) {
    if (lower.startsWith(r.prefix)) {
      const rest = p.slice(r.prefix.length);
      if (rest && !rest.includes('/')) {
        let slug = rest;
        try {
          slug = decodeURIComponent(rest);
        } catch {
          return null;
        }
        return { kind: r.kind, slug, section: r.section };
      }
    }
  }
  return null;
}
