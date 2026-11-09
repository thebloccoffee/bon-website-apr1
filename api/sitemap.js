// /sitemap.xml (rewritten here by vercel.json). Built from the route table
// plus published rows, so new posts, products and destinations show up
// without a redeploy. Anon key: RLS returns published rows only.
import { STATIC_ROUTES, canonicalUrl } from '../src/lib/seo-routes.js';
import { supabaseSelectColumns, escapeXml, CACHE_CONTROL } from '../server-lib/seo.js';
import { allPlaceRoutes } from '../src/lib/places.js';

function day(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function entry({ path, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(canonicalUrl(path))}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

const SLUG_OK = (s) => typeof s === 'string' && s.length > 0 && !s.includes('/');

async function rows(table, extra = []) {
  const { rows: list } = await supabaseSelectColumns(
    table,
    [...extra, 'slug,created_at,updated_at', 'slug,created_at'],
    { status: 'eq.published', limit: 5000 }
  );
  return list.filter((r) => SLUG_OK(r.slug));
}

export async function buildSitemap() {
  const [posts, products, destinations] = await Promise.all([
    rows('blog_posts', ['slug,created_at,updated_at,brand']),
    rows('shop_products'),
    rows('destinations'),
  ]);

  const latest = (list) => list.map((r) => day(r.updated_at || r.created_at)).filter(Boolean).sort().pop() || null;
  const sectionLastmod = { '/journal': latest(posts), '/shop': latest(products), '/travel': latest(destinations) };
  sectionLastmod['/'] = [sectionLastmod['/journal'], sectionLastmod['/shop'], sectionLastmod['/travel']]
    .filter(Boolean)
    .sort()
    .pop() || null;

  const entries = [
    ...Object.entries(STATIC_ROUTES)
      .filter(([, meta]) => meta.sitemap && !meta.noindex)
      .map(([path, meta]) => entry({ path, lastmod: sectionLastmod[path], ...meta.sitemap })),
    ...posts.map((p) =>
      entry({ path: `${p.brand === 'bonpoints' ? '/bonpoints/guides' : '/journal'}/${encodeURIComponent(p.slug)}`, lastmod: day(p.updated_at || p.created_at), changefreq: 'monthly', priority: '0.7' })
    ),
    ...products.map((p) =>
      entry({ path: `/shop/${encodeURIComponent(p.slug)}`, lastmod: day(p.updated_at || p.created_at), changefreq: 'monthly', priority: '0.7' })
    ),
    ...allPlaceRoutes().map((p) =>
      entry({ path: `/travel/${encodeURIComponent(p.slug)}`, lastmod: sectionLastmod['/'], changefreq: 'weekly', priority: p.kind === 'country' ? '0.7' : '0.6' })
    ),
    ...destinations
      .filter((d) => !allPlaceRoutes().some((p) => p.slug === d.slug))
      .map((d) =>
        entry({ path: `/travel/${encodeURIComponent(d.slug)}`, lastmod: day(d.updated_at || d.created_at), changefreq: 'monthly', priority: '0.6' })
      ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

export default async function handler(req, res) {
  const xml = await buildSitemap();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', CACHE_CONTROL);
  res.end(xml);
}
