// Generated from the database so new journal entries and products appear
// without a redeploy. Reads with the anon key: published rows only, which is
// exactly what belongs in a sitemap.

export const config = { runtime: 'edge' };

const SITE = 'https://www.tabasjonbon.com';

const STATIC = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/journal', priority: '0.9', changefreq: 'weekly' },
  { loc: '/portfolio', priority: '0.9', changefreq: 'monthly' },
  { loc: '/shop', priority: '0.9', changefreq: 'weekly' },
  { loc: '/contact', priority: '0.5', changefreq: 'yearly' },
];

async function fetchPublished(table, columns) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=${columns}&status=eq.published`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${SITE}${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

export default async function handler() {
  const [posts, products] = await Promise.all([
    fetchPublished('blog_posts', 'slug,created_at'),
    fetchPublished('shop_products', 'slug,created_at'),
  ]);

  const entries = [
    ...STATIC.map(urlEntry),
    ...posts.map((p) =>
      urlEntry({ loc: `/journal/${p.slug}`, lastmod: p.created_at, changefreq: 'monthly', priority: '0.8' })
    ),
    ...products.map((p) =>
      urlEntry({ loc: `/shop/${p.slug}`, lastmod: p.created_at, changefreq: 'monthly', priority: '0.8' })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, must-revalidate',
    },
  });
}
