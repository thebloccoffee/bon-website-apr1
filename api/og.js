// Compat shim. Head injection for every route now lives in api/page.js, and
// vercel.json no longer sends anything here. Old /api/og?slug=... links get a
// permanent redirect to the canonical journal URL. The slug is validated and
// encoded, so nothing from the query reaches HTML or a database query.
export default function handler(req, res) {
  let slug = req.query?.slug;
  if (Array.isArray(slug)) slug = slug[0];
  const valid = typeof slug === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(slug);
  const location = valid ? `/journal/${encodeURIComponent(slug)}` : '/journal';
  res.statusCode = 308;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end();
}
