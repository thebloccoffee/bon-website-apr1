// Run: node tests/seo.test.mjs
// Exercises api/page.js, api/sitemap.js and api/og.js with mocked req/res and
// a mocked fetch (index.html shell + Supabase REST). No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_HTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* ---------------------------------------------------------------- mocks */

const db = {
  blog_posts: [
    {
      slug: 'natural-bridge',
      title: 'The Natural Bridge',
      excerpt: '',
      content: '<p>We hiked out to the <b>Natural Bridge</b> on a cold morning.</p>',
      cover_image: 'https://example.supabase.co/storage/v1/object/public/media/bridge.JPG',
      created_at: '2026-05-04T17:36:02.107093+00:00',
      location: 'Canada',
      city: null,
      tags: [],
      status: 'published',
    },
    {
      slug: 'evil',
      title: '<script>alert(1)</script>&" $& $1',
      excerpt: 'Desc with </script><!-- and "quotes" & ampersands',
      cover_image: '/x.jpg" onerror="alert(1)',
      created_at: '2026-01-01T00:00:00Z',
      status: 'published',
    },
  ],
  destinations: [{ slug: 'xiamen', name: 'Xiamen', tagline: '', description: '', cover_image: '', status: 'published', created_at: '2026-04-01T00:00:00Z' }],
  shop_products: null, // null = table missing (PGRST205), like prod today
  videos: null,
};

const calls = [];
let supabaseMode = 'ok'; // 'ok' | 'timeout' | 'error'

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  calls.push(url);
  if (url.endsWith('/index.html')) {
    return new Response(INDEX_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }
  const m = url.match(/\/rest\/v1\/([a-z_]+)\?(.*)$/);
  if (!m) return new Response('not found', { status: 404 });
  if (supabaseMode === 'timeout') {
    return new Promise((_, reject) => {
      opts.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
  }
  if (supabaseMode === 'error') return jsonResponse(500, { message: 'boom' });
  const table = m[1];
  const params = new URLSearchParams(m[2]);
  const rows = db[table];
  if (rows === null) return jsonResponse(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}'` });
  const select = params.get('select') || '*';
  if (table === 'blog_posts' && select.includes('updated_at')) {
    return jsonResponse(400, { code: '42703', message: 'column blog_posts.updated_at does not exist' });
  }
  let out = rows.filter((r) => r.status === 'published');
  const slug = params.get('slug');
  if (slug) out = out.filter((r) => `eq.${r.slug}` === slug);
  return jsonResponse(200, out);
};

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    end(b = '') {
      this.body = String(b);
      this.ended = true;
    },
  };
  return res;
}

const { default: page } = await import('../api/page.js');
const { default: sitemap } = await import('../api/sitemap.js');
const { default: og } = await import('../api/og.js');
const seo = await import('../server-lib/seo.js');

async function get(p, query) {
  const req = { url: `/api/page?path=${encodeURIComponent(p)}`, query: query || { path: p.replace(/^\//, '') }, headers: { host: 'www.tabasjonbon.com' } };
  const res = mockRes();
  await page(req, res);
  return res;
}

const ldBlocks = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const between = (html) => html.slice(html.indexOf('<!-- seo:start -->'), html.indexOf('<!-- seo:end -->'));

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}\n${e.stack}`);
    process.exitCode = 1;
  }
}

/* ---------------------------------------------------------------- tests */

await test('index.html seo block matches renderHead(staticSeo("/"))', () => {
  const block = INDEX_HTML.slice(
    INDEX_HTML.indexOf('<!-- seo:start -->') + '<!-- seo:start -->'.length,
    INDEX_HTML.indexOf('<!-- seo:end -->')
  );
  assert.equal(block.trim(), seo.renderHead(seo.staticSeo('/')).trim(), 'index.html is out of sync; paste the output of renderHead(staticSeo("/"))');
});

await test('home: 200, Person + WebSite SearchAction', async () => {
  const res = await get('/');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['cache-control'], /s-maxage=300, stale-while-revalidate=86400/);
  assert.match(res.body, /<title>Jon Bon Tabas<\/title>/);
  assert.match(res.body, /<link rel="canonical" href="https:\/\/www\.tabasjonbon\.com" \/>/);
  const ld = ldBlocks(res.body);
  const person = ld.find((x) => x['@type'] === 'Person');
  assert.ok(person.sameAs.includes('https://instagram.com/jooonbon'));
  assert.ok(person.sameAs.includes('https://youtube.com/@bonpoints'));
  const site = ld.find((x) => x['@type'] === 'WebSite');
  assert.equal(site.potentialAction.target.urlTemplate, 'https://www.tabasjonbon.com/search?q={search_term_string}');
  assert.ok(res.body.includes('<div id="root"></div>'));
  assert.equal((res.body.match(/<title>/g) || []).length, 1);
});

await test('/journal/natural-bridge: Article + BreadcrumbList, description from content', async () => {
  calls.length = 0;
  const res = await get('/journal/natural-bridge');
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<title>The Natural Bridge \| Jon Bon Tabas<\/title>/);
  assert.match(res.body, /<meta property="og:type" content="article" \/>/);
  assert.match(res.body, /href="https:\/\/www\.tabasjonbon\.com\/journal\/natural-bridge"/);
  assert.match(res.body, /content="We hiked out to the Natural Bridge on a cold morning\."/);
  const ld = ldBlocks(res.body);
  const article = ld.find((x) => x['@type'] === 'Article');
  assert.equal(article.headline, 'The Natural Bridge');
  assert.equal(article.datePublished, '2026-05-04T17:36:02.107093+00:00');
  assert.equal(article.contentLocation.name, 'Canada');
  const crumbs = ld.find((x) => x['@type'] === 'BreadcrumbList');
  assert.equal(crumbs.itemListElement.length, 3);
  assert.ok(calls.some((u) => u.includes('/rest/v1/blog_posts?') && u.includes('slug=eq.natural-bridge')));
});

await test('trailing slash and case: canonical is clean', async () => {
  const res = await get('/Journal/', { path: 'Journal/' });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<link rel="canonical" href="https:\/\/www\.tabasjonbon\.com\/journal" \/>/);
});

await test('unknown journal slug: 404, noindex, SPA shell still served', async () => {
  const res = await get('/journal/does-not-exist');
  assert.equal(res.statusCode, 404);
  assert.equal(res.headers['x-robots-tag'], 'noindex');
  assert.match(res.body, /<meta name="robots" content="noindex, follow" \/>/);
  assert.ok(!/rel="canonical"/.test(between(res.body)));
  assert.ok(res.body.includes('<div id="root"></div>'));
  assert.ok(res.body.includes('/src/main.jsx'));
});

await test('unknown route: 404 noindex', async () => {
  const res = await get('/nope/at/all');
  assert.equal(res.statusCode, 404);
  assert.match(res.body, /noindex/);
});

await test('/shop/x with shop_products table missing: 404', async () => {
  const res = await get('/shop/x');
  assert.equal(res.statusCode, 404);
  assert.match(res.body, /noindex/);
});

await test('/shop/thanks is static and noindex, not a product lookup', async () => {
  calls.length = 0;
  const res = await get('/shop/thanks');
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /noindex/);
  assert.ok(!calls.some((u) => u.includes('shop_products')));
});

await test('product: offers only when price parses', async () => {
  db.shop_products = [
    { slug: 'pack-1', title: 'Pack 1', subtitle: 'Test pack', price_formatted: '$29', brand: 'jooonbon', status: 'published' },
    { slug: 'pack-2', title: 'Pack 2', subtitle: 'Test pack', price_formatted: 'From $19', brand: 'bonpoints', status: 'published' },
  ];
  try {
    const a = ldBlocks((await get('/shop/pack-1')).body).find((x) => x['@type'] === 'Product');
    assert.deepEqual(a.offers.price, '29.00');
    assert.equal(a.offers.priceCurrency, 'CAD');
    assert.equal(a.brand.name, 'jooonbon');
    const b = ldBlocks((await get('/shop/pack-2')).body).find((x) => x['@type'] === 'Product');
    assert.equal(b.offers, undefined);
    assert.equal(b.brand.name, 'bon.points');
  } finally {
    db.shop_products = null;
  }
  assert.equal(seo.parsePrice('CA$12.50').price, '12.50');
  assert.equal(seo.parsePrice('29'), null);
  assert.equal(seo.parsePrice('$19–$29'), null);
  assert.equal(seo.parsePrice(null), null);
});

await test('escaping: <script>&" in DB values is inert everywhere', async () => {
  const res = await get('/journal/evil');
  const head = between(res.body);
  assert.ok(!head.includes('<script>alert'), 'raw script tag leaked');
  assert.ok(head.includes('<title>&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot; $&amp; $1 | Jon Bon Tabas</title>'));
  assert.ok(!head.includes('onerror="'), 'attribute breakout in image');
  assert.ok(head.includes('&quot; onerror=&quot;'));
  // JSON-LD: no "</script" or "<!--" inside the script body, and it still parses back.
  for (const m of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.ok(!/<\/script|<!--/i.test(m[1]));
  }
  const article = ldBlocks(res.body).find((x) => x['@type'] === 'Article');
  assert.equal(article.headline, '<script>alert(1)</script>&" $& $1');
  // "$&" stayed literal (function replacer), and the shell's other tags are intact.
  assert.ok(res.body.includes('/favicon.ico'));
  assert.equal((res.body.match(/<title>/g) || []).length, 1);
});

await test('slug is encodeURIComponent-ed into the Supabase query', async () => {
  calls.length = 0;
  await get('/journal/a%26select%3D*', { path: 'journal/a%26select%3D*' });
  const u = calls.find((x) => x.includes('/rest/v1/blog_posts?'));
  assert.ok(u.includes('slug=eq.a%26select%3D*'), u);
  assert.ok(!/[?&]select=\*&.*select=/.test(u));
});

await test('Supabase timeout: 200 with section copy, never a false 404', async () => {
  supabaseMode = 'timeout';
  try {
    const t0 = Date.now();
    const res = await get('/journal/natural-bridge');
    assert.ok(Date.now() - t0 < 3500);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /<title>Journal \| Jon Bon Tabas<\/title>/);
    assert.match(res.body, /href="https:\/\/www\.tabasjonbon\.com\/journal\/natural-bridge"/);
  } finally {
    supabaseMode = 'ok';
  }
});

await test('Supabase 500: 200 with section copy', async () => {
  supabaseMode = 'error';
  try {
    const res = await get('/travel/xiamen');
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /<title>Travel destinations \| Jon Bon Tabas<\/title>/);
  } finally {
    supabaseMode = 'ok';
  }
});

await test('destination: name in title, breadcrumbs', async () => {
  const res = await get('/travel/xiamen');
  assert.match(res.body, /<title>Xiamen \| Jon Bon Tabas<\/title>/);
  assert.ok(ldBlocks(res.body).some((x) => x['@type'] === 'BreadcrumbList'));
});

await test('/videos: tolerates missing table, ItemList when rows exist', async () => {
  let res = await get('/videos');
  assert.equal(res.statusCode, 200);
  assert.ok(!ldBlocks(res.body).some((x) => x['@type'] === 'ItemList'));
  db.videos = [
    { youtube_id: 'abcdefghijk', slug: 'v1', title: 'Video 1', description: 'd', published_at: '2026-10-01T00:00:00Z', duration_sec: 615, status: 'published' },
    { youtube_id: 'bad', slug: 'v2', title: 'Broken id', status: 'published' },
  ];
  try {
    res = await get('/videos');
    const list = ldBlocks(res.body).find((x) => x['@type'] === 'ItemList');
    assert.equal(list.itemListElement.length, 1);
    const v = list.itemListElement[0].item;
    assert.equal(v['@type'], 'VideoObject');
    assert.equal(v.duration, 'PT10M15S');
    assert.equal(v.uploadDate, '2026-10-01T00:00:00Z');
  } finally {
    db.videos = null;
  }
});

await test('handler without rewrite query falls back to "/"', async () => {
  const res = mockRes();
  await page({ url: '/api/page', query: {}, headers: { host: 'www.tabasjonbon.com' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<title>Jon Bon Tabas<\/title>/);
});

await test('bad Host header is refused (no shell fetch to odd origins)', async () => {
  const res = mockRes();
  await page({ url: '/', query: { path: '' }, headers: { host: 'evil.com/@x' } }, res);
  assert.equal(res.statusCode, 503);
});

await test('sitemap: well-formed XML, static + DB rows, noindex routes left out', async () => {
  const res = mockRes();
  await sitemap({ headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/xml/);
  const xml = res.body;
  for (const p of ['', '/journal', '/bonpoints', '/bonpoints/guides', '/travel', '/shop', '/about', '/journal/natural-bridge', '/journal/evil', '/travel/xiamen']) {
    assert.ok(xml.includes(`<loc>https://www.tabasjonbon.com${p}</loc>`), `missing ${p}`);
  }
  for (const p of ['/admin', '/search', '/shop/thanks']) {
    assert.ok(!xml.includes(`<loc>https://www.tabasjonbon.com${p}</loc>`), `should not list ${p}`);
  }
  assert.ok(xml.includes('<lastmod>2026-05-04</lastmod>'));
  // Well-formedness: xmllint when available, plus a tag-balance check.
  try {
    execFileSync('xmllint', ['--noout', '-'], { input: xml, stdio: ['pipe', 'ignore', 'pipe'] });
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error(`xmllint: ${e.stderr}`);
  }
  const stack = [];
  for (const [, close, name] of xml.replace(/<\?xml[^>]*\?>/, '').matchAll(/<(\/?)([a-z]+)[^>]*>/g)) {
    if (close) assert.equal(stack.pop(), name);
    else stack.push(name);
  }
  assert.equal(stack.length, 0);
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml));
});

await test('api/og: compat redirect, validated slug', async () => {
  let res = mockRes();
  og({ query: { slug: 'natural-bridge' } }, res);
  assert.equal(res.statusCode, 308);
  assert.equal(res.headers.location, '/journal/natural-bridge');
  res = mockRes();
  og({ query: { slug: '"><script>' } }, res);
  assert.equal(res.headers.location, '/journal');
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
