// Serves the SPA shell (built index.html) with the right <head> for every
// route and every visitor: title, description, canonical, OG/Twitter, JSON-LD.
// vercel.json rewrites every non-file, non-/api path here as /api/page?path=...
// "/" itself is served straight from the static index.html, whose default
// head block is the home page's (kept in sync by tests/seo.test.mjs).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveSeo, injectHead, CACHE_CONTROL, CACHE_CONTROL_404 } from '../server-lib/seo.js';

const SHELL_TTL_MS = 60 * 1000;
let shellCache = { origin: null, html: null, at: 0 };

function shellOrigin(req) {
  if (process.env.SEO_SHELL_ORIGIN) return process.env.SEO_SHELL_ORIGIN.replace(/\/+$/, '');
  const host = String(req.headers?.host || '').trim();
  // Host comes from the request that reached this deployment; still refuse anything odd.
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return null;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  return `${local ? 'http' : 'https'}://${host}`;
}

// Built index.html bundled with the function (vercel.json includeFiles).
// Read once per instance; avoids an HTTP round trip and works behind
// preview Deployment Protection.
let diskShell;
async function readShellFromDisk() {
  if (!process.env.VERCEL) return null; // local dev/tests serve the live shell
  if (diskShell !== undefined) return diskShell;
  try {
    const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
    diskShell = html.includes('<div id="root">') ? html : null;
  } catch {
    diskShell = null;
  }
  return diskShell;
}

async function fetchShell(origin) {
  const local = await readShellFromDisk();
  if (local) return local;
  const now = Date.now();
  if (shellCache.html && shellCache.origin === origin && now - shellCache.at < SHELL_TTL_MS) {
    return shellCache.html;
  }
  const headers = { Accept: 'text/html' };
  // Lets preview deployments with Vercel Authentication fetch their own shell.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  // /index.html is a real static file and has an extension, so the page
  // rewrite never matches it: no loop back into this function.
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${origin}/index.html`, { headers, signal: controller.signal });
      if (res.ok) {
        const html = await res.text();
        if (html.includes('<div id="root">')) {
          shellCache = { origin, html, at: now };
          return html;
        }
      }
    } catch {
      /* retry */
    } finally {
      clearTimeout(timer);
    }
  }
  return shellCache.origin === origin ? shellCache.html : null;
}

function requestPath(req) {
  let p = req.query?.path;
  if (Array.isArray(p)) p = p[0];
  if (typeof p !== 'string') {
    // Called without the rewrite (e.g. /api/page directly): use the URL path.
    const urlPath = String(req.url || '/').split('?')[0];
    p = urlPath.startsWith('/api/') ? '/' : urlPath;
  }
  return `/${p.replace(/^\/+/, '')}`;
}

export default async function handler(req, res) {
  const path = requestPath(req);
  const origin = shellOrigin(req);
  const [seo, shell] = await Promise.all([resolveSeo(path), origin ? fetchShell(origin) : null]);

  if (!shell) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '5');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Temporarily unavailable. Please refresh.');
    return;
  }

  res.statusCode = seo.status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', seo.status === 200 ? CACHE_CONTROL : CACHE_CONTROL_404);
  if (seo.noindex) res.setHeader('X-Robots-Tag', 'noindex');
  res.end(injectHead(shell, seo));
}
