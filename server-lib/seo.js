/**
 * Server-side SEO: resolves the head (title, description, canonical, OG,
 * Twitter, JSON-LD) for any SPA path and injects it into the built index.html.
 * Used by api/page.js and api/sitemap.js. Static copy lives in
 * src/lib/seo-routes.js so the browser (Seo.jsx) uses the same text.
 */
import {
  SITE_URL,
  SITE_NAME,
  PERSON_NAME,
  SAME_AS,
  STATIC_ROUTES,
  NOT_FOUND,
  formatTitle,
  canonicalUrl,
  absoluteUrl,
  matchRoute,
} from '../src/lib/seo-routes.js';
import { BRANDS } from '../src/lib/brands.js';

// Public values, same as src/api/supabaseClient.js. The anon key is public by
// design (RLS limits it to published rows).
const FALLBACK_SUPABASE_URL = 'https://jgmthehikpgcjbchlmug.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbXRoZWhpa3BnY2piY2hsbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTA0NDUsImV4cCI6MjA5MDY2NjQ0NX0.3DKKVRRdyFPjbFh0u2jTXzFI1965r3UtlM5GVUSgyvw';

export const FETCH_TIMEOUT_MS = 2000;
export const CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
export const CACHE_CONTROL_404 = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

/* ------------------------------------------------------------------ utils */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
export function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
}

/** JSON for inside <script>: no "</script>", no HTML comment openers, no JS line separators. */
export function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/ /g, '\\u2028')
    .replace(/ /g, '\\u2029');
}

/** Strip tags and entities-lite, collapse whitespace, cut at a word boundary. */
export function plainText(html, max = 160) {
  const text = String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}...`;
}

/**
 * price_formatted is display text ("$29", "CA$29.00", "29 CAD"). Only return a
 * number when the whole string is one unambiguous CAD amount; anything else
 * ("From $19", "$19–$29", "Free*") returns null and the Offer is omitted.
 */
export function parsePrice(formatted) {
  if (typeof formatted !== 'string') return null;
  const m = formatted
    .trim()
    .match(/^(?:CA\$|C\$|CAD\s*\$?|\$)?\s*(\d{1,5}(?:\.\d{2})?)\s*(?:CAD)?$/i);
  if (!m) return null;
  // A bare number with no currency marker is still ambiguous.
  if (!/[$]|CAD/i.test(formatted)) return null;
  return { price: m[1].includes('.') ? m[1] : `${m[1]}.00`, currency: 'CAD' };
}

function isoDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return undefined;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${sec || (!h && !m) ? `${sec}S` : ''}`;
}

/* --------------------------------------------------------------- supabase */

function supabaseConfig() {
  return {
    url: (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL).replace(/\/+$/, ''),
    key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  };
}

/**
 * GET /rest/v1/<table>?<params>. `params` is an object; every value is
 * encodeURIComponent'd. Returns { ok, rows }:
 *   ok=true,  rows=[...]  query ran (rows may be empty; a missing table counts as empty)
 *   ok=false, rows=[]     network error, timeout, 5xx or bad column. Caller should not 404.
 */
export async function supabaseSelect(table, params = {}) {
  const { url, key } = supabaseConfig();
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?${qs}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.ok) {
      const rows = await res.json();
      return { ok: true, rows: Array.isArray(rows) ? rows : [] };
    }
    // PGRST205 / 42P01: table not created yet (migrations not applied). Treat as empty.
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    if (body && (body.code === 'PGRST205' || body.code === '42P01')) return { ok: true, rows: [] };
    return { ok: false, rows: [], error: body?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, rows: [], error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Select with a column list, falling back to fewer columns if one doesn't exist yet. */
export async function supabaseSelectColumns(table, columnSets, params = {}) {
  let last = { ok: false, rows: [] };
  for (const select of columnSets) {
    last = await supabaseSelect(table, { select, ...params });
    if (last.ok) return last;
    if (!/column|does not exist|42703/i.test(last.error || '')) return last;
  }
  return last;
}

/* -------------------------------------------------------------- json-ld */

const personRef = () => ({ '@type': 'Person', name: PERSON_NAME, url: SITE_URL });

function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: url,
    })),
  };
}

function homeJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: PERSON_NAME,
      url: SITE_URL,
      image: absoluteUrl('/og-image.png'),
      description: STATIC_ROUTES['/'].description,
      homeLocation: { '@type': 'Place', name: 'Vancouver, British Columbia, Canada' },
      sameAs: SAME_AS,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#person` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

/* --------------------------------------------------------------- resolve */

function baseMeta(path, meta) {
  return {
    status: 200,
    title: formatTitle(meta.title),
    ogTitle: meta.title || SITE_NAME,
    description: meta.description || STATIC_ROUTES['/'].description,
    canonical: canonicalUrl(path),
    image: absoluteUrl(meta.image),
    type: meta.type || 'website',
    noindex: Boolean(meta.noindex),
    extraMeta: [],
    jsonLd: [],
  };
}

/** Synchronous head for a static route (also used to keep index.html in sync). */
export function staticSeo(path) {
  const meta = STATIC_ROUTES[path];
  if (!meta) return notFoundSeo(path);
  const out = baseMeta(path, meta);
  if (path === '/') out.jsonLd = homeJsonLd();
  return out;
}

export function notFoundSeo(path) {
  const out = baseMeta(path, NOT_FOUND);
  out.status = 404;
  out.canonical = null;
  return out;
}

/** Section copy when a row couldn't be loaded (timeout etc). Never 404s a real page on a hiccup. */
function sectionFallback(path, section) {
  const out = baseMeta(path, STATIC_ROUTES[section]);
  out.canonical = canonicalUrl(path);
  return out;
}

async function postSeo(path, slug, section) {
  const { ok, rows } = await supabaseSelect('blog_posts', {
    select: '*',
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: 1,
  });
  if (!ok) return sectionFallback(path, section);
  const post = rows[0];
  if (!post) return notFoundSeo(path);

  const canonical = canonicalUrl(`/journal/${post.slug}`);
  const where = [post.city, post.location].filter(Boolean).join(', ');
  const description =
    plainText(post.excerpt) ||
    plainText(post.content) ||
    `A story by ${PERSON_NAME}${where ? ` from ${where}` : ''}.`;
  const image = absoluteUrl(post.cover_image);
  const out = baseMeta(path, { title: post.title, description, type: 'article' });
  out.canonical = canonical;
  out.image = image;
  if (post.created_at) out.extraMeta.push(['property', 'article:published_time', post.created_at]);
  if (post.updated_at) out.extraMeta.push(['property', 'article:modified_time', post.updated_at]);

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: String(post.title || '').slice(0, 110),
    description,
    image: [image],
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: personRef(),
    publisher: personRef(),
  };
  if (post.created_at) article.datePublished = post.created_at;
  if (post.updated_at || post.created_at) article.dateModified = post.updated_at || post.created_at;
  if (where) article.contentLocation = { '@type': 'Place', name: where };
  if (Array.isArray(post.tags) && post.tags.length) article.keywords = post.tags.join(', ');

  out.jsonLd = [
    article,
    breadcrumbs([
      ['Home', SITE_URL],
      ['Journal', canonicalUrl('/journal')],
      [post.title, canonical],
    ]),
  ];
  return out;
}

async function productSeo(path, slug, section) {
  const { ok, rows } = await supabaseSelect('shop_products', {
    select: '*',
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: 1,
  });
  if (!ok) return sectionFallback(path, section);
  const product = rows[0];
  if (!product) return notFoundSeo(path);

  const canonical = canonicalUrl(`/shop/${product.slug}`);
  const description =
    plainText(product.subtitle) || plainText(product.description) || STATIC_ROUTES['/shop'].description;
  const image = absoluteUrl(product.cover_image);
  const out = baseMeta(path, { title: product.title, description, type: 'product' });
  out.canonical = canonical;
  out.image = image;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: plainText(product.description, 5000) || description,
    image: [image],
    url: canonical,
  };
  const brand = BRANDS[product.brand];
  if (brand) ld.brand = { '@type': 'Brand', name: brand.name };
  const price = parsePrice(product.price_formatted);
  if (price) {
    ld.offers = {
      '@type': 'Offer',
      price: price.price,
      priceCurrency: price.currency,
      availability: 'https://schema.org/InStock',
      url: canonical,
    };
    out.extraMeta.push(['property', 'product:price:amount', price.price]);
    out.extraMeta.push(['property', 'product:price:currency', price.currency]);
  }
  out.jsonLd = [
    ld,
    breadcrumbs([
      ['Home', SITE_URL],
      ['Shop', canonicalUrl('/shop')],
      [product.title, canonical],
    ]),
  ];
  return out;
}

async function destinationSeo(path, slug, section) {
  const { ok, rows } = await supabaseSelect('destinations', {
    select: '*',
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: 1,
  });
  if (!ok) return sectionFallback(path, section);
  const dest = rows[0];
  if (!dest) return notFoundSeo(path);

  const canonical = canonicalUrl(`/travel/${dest.slug}`);
  const description =
    plainText(dest.description) ||
    plainText(dest.tagline) ||
    `Stories and videos from ${dest.name} by ${PERSON_NAME}.`;
  const out = baseMeta(path, { title: dest.name, description });
  out.canonical = canonical;
  out.image = absoluteUrl(dest.cover_image);
  out.jsonLd = [
    breadcrumbs([
      ['Home', SITE_URL],
      ['Travel', canonicalUrl('/travel')],
      [dest.name, canonical],
    ]),
  ];
  return out;
}

async function videosSeo(path) {
  const out = staticSeo(path);
  const { rows } = await supabaseSelect('videos', {
    select: 'youtube_id,slug,title,description,published_at,duration_sec',
    status: 'eq.published',
    order: 'published_at.desc.nullslast',
    limit: 50,
  });
  const videos = rows.filter((v) => v && /^[A-Za-z0-9_-]{11}$/.test(v.youtube_id || '') && v.title);
  if (videos.length) {
    out.jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: videos.map((v, i) => {
          const item = {
            '@type': 'VideoObject',
            name: v.title,
            description: plainText(v.description, 300) || v.title,
            thumbnailUrl: [`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`],
            embedUrl: `https://www.youtube.com/embed/${v.youtube_id}`,
            contentUrl: `https://www.youtube.com/watch?v=${v.youtube_id}`,
          };
          if (v.published_at) item.uploadDate = v.published_at;
          const duration = isoDuration(v.duration_sec);
          if (duration) item.duration = duration;
          return { '@type': 'ListItem', position: i + 1, item };
        }),
      },
    ];
  }
  return out;
}

/** Resolve the head for any request path. Never throws. */
export async function resolveSeo(rawPath) {
  const match = matchRoute(rawPath);
  if (!match) return notFoundSeo(rawPath);
  try {
    if (match.kind === 'static') {
      if (match.path === '/videos') return await videosSeo(match.path);
      return staticSeo(match.path);
    }
    const path = `${match.section}/${match.slug}`;
    if (match.kind === 'post') return await postSeo(path, match.slug, match.section);
    if (match.kind === 'product') return await productSeo(path, match.slug, match.section);
    if (match.kind === 'destination') return await destinationSeo(path, match.slug, match.section);
  } catch {
    /* fall through */
  }
  return match.kind === 'static' ? staticSeo(match.path) : sectionFallback(rawPath, match.section);
}

/* ------------------------------------------------------------- rendering */

export const SEO_START = '<!-- seo:start -->';
export const SEO_END = '<!-- seo:end -->';

/** The managed <head> block. Every value is escaped. */
export function renderHead(seo) {
  const lines = [];
  const meta = (attr, key, content) =>
    lines.push(`<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`);

  lines.push(`<title>${escapeHtml(seo.title)}</title>`);
  meta('name', 'description', seo.description);
  if (seo.canonical) lines.push(`<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`);
  if (seo.noindex) meta('name', 'robots', 'noindex, follow');
  meta('property', 'og:site_name', SITE_NAME);
  meta('property', 'og:type', seo.type);
  meta('property', 'og:title', seo.ogTitle || seo.title);
  meta('property', 'og:description', seo.description);
  if (seo.canonical) meta('property', 'og:url', seo.canonical);
  meta('property', 'og:image', seo.image);
  meta('name', 'twitter:card', 'summary_large_image');
  meta('name', 'twitter:title', seo.ogTitle || seo.title);
  meta('name', 'twitter:description', seo.description);
  meta('name', 'twitter:image', seo.image);
  for (const [attr, key, content] of seo.extraMeta || []) meta(attr, key, content);
  for (const data of seo.jsonLd || []) {
    lines.push(`<script type="application/ld+json">${serializeJsonLd(data)}</script>`);
  }
  return lines.map((l) => `    ${l}`).join('\n');
}

// Tags we own, removed when index.html has no markers.
const MANAGED_TAGS = [
  /<title\b[^>]*>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name=["'](?:description|robots|twitter:[^"']*)["'][^>]*>\s*/gi,
  /<meta\s+property=["'](?:og:[^"']*|article:[^"']*|product:[^"']*)["'][^>]*>\s*/gi,
  /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
  /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
];

/** Put the managed head block into the SPA shell. Uses function replacers so "$" in values is inert. */
export function injectHead(html, seo) {
  const block = `${SEO_START}\n${renderHead(seo)}\n    ${SEO_END}`;
  const start = html.indexOf(SEO_START);
  const end = html.indexOf(SEO_END);
  if (start !== -1 && end > start) {
    return html.slice(0, start) + block + html.slice(end + SEO_END.length);
  }
  let out = html;
  for (const re of MANAGED_TAGS) out = out.replace(re, () => '');
  return out.replace(/<\/head>/i, () => `    ${block}\n  </head>`);
}
