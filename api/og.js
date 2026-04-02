// Vercel serverless function — injects OG tags for /journal/:slug
// Called by Vercel middleware for social share crawlers

export default async function handler(req, res) {
  const slug = req.query.slug;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!slug || !supabaseUrl || !supabaseKey) {
    return res.redirect('/');
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${slug}&status=eq.published&select=title,excerpt,cover_image`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const [post] = await response.json();

    if (!post) return res.redirect('/journal');

    const pageUrl = `https://${req.headers.host}/journal/${slug}`;
    const title = post.title;
    const description = post.excerpt || 'A travel dispatch by Jon Bon Tabas.';
    const image = post.cover_image || '';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title} — Jon Bon Tabas</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Jon Bon Tabas" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${pageUrl}">${title}</a>...</p>
</body>
</html>`);
  } catch {
    res.redirect('/journal');
  }
}
