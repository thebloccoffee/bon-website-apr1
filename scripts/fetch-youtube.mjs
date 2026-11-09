#!/usr/bin/env node
/**
 * Build supabase/seed/videos.sql from Jon's two public YouTube channels plus
 * the YouTube videos linked in portfolio_projects.
 *
 *   node scripts/fetch-youtube.mjs            # writes supabase/seed/videos.sql
 *   node scripts/fetch-youtube.mjs --stdout   # print instead of writing
 *
 * Sources, in order:
 *   1. Public RSS feed (feeds/videos.xml?channel_id=...). Only the latest 15
 *      uploads, and YouTube sometimes serves 404 for every channel.
 *   2. The channel's /videos and /shorts tabs (ytInitialData + browse
 *      continuations), so the seed covers the full catalogue.
 *   3. Each watch page, for exact publishDate, description and length when the
 *      RSS feed did not supply them.
 *
 * No API key, no DB writes. The generated SQL is idempotent:
 *   INSERT ... ON CONFLICT (youtube_id) DO NOTHING
 * Run it yourself in the Supabase SQL editor after the hub migration.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'supabase/seed/videos.sql');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jgmthehikpgcjbchlmug.supabase.co';
// Public anon key (same as src/api/supabaseClient.js). RLS limits it to published rows.
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbXRoZWhpa3BnY2piY2hsbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTA0NDUsImV4cCI6MjA5MDY2NjQ0NX0.3DKKVRRdyFPjbFh0u2jTXzFI1965r3UtlM5GVUSgyvw';

const CHANNELS = [
  { brand: 'jooonbon', handles: ['https://www.youtube.com/@jonbontabas', 'https://www.youtube.com/jonbontabas', 'https://www.youtube.com/@jooonbon'] },
  { brand: 'bonpoints', handles: ['https://www.youtube.com/@bonpoints'] },
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1' };
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

const log = (...a) => console.error('[fetch-youtube]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url, opts = {}) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow', ...opts });
  return { status: res.status, text: await res.text() };
}

// ---------------------------------------------------------------------------
// Channel ID
// ---------------------------------------------------------------------------
async function findChannelId(urls) {
  for (const url of urls) {
    try {
      const { status, text } = await getText(url);
      if (status !== 200) continue;
      const m = text.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) || text.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/);
      if (m) return { id: m[1], url };
    } catch (e) {
      log('channel lookup failed', url, e.message);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. RSS
// ---------------------------------------------------------------------------
const decodeXml = (s = '') =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

async function fetchRss(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const { status, text } = await getText(url);
    if (status !== 200) {
      log(`RSS ${status} for ${channelId}, falling back to channel tabs`);
      return [];
    }
    const entries = text.split('<entry>').slice(1);
    return entries
      .map((e) => {
        const tag = (t) => decodeXml((e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '').trim();
        const id = tag('yt:videoId');
        const link = (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || '';
        return {
          youtube_id: id,
          title: tag('title'),
          description: tag('media:description'),
          published_at: tag('published') || null,
          format: link.includes('/shorts/') ? 'short' : 'long',
          source: 'rss',
        };
      })
      .filter((v) => ID_RE.test(v.youtube_id));
  } catch (e) {
    log('RSS failed', e.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. Channel tabs (/videos, /shorts) with browse continuations
// ---------------------------------------------------------------------------
function extractJson(html, varName) {
  const start = html.indexOf(`${varName} = `);
  if (start < 0) return null;
  const from = html.indexOf('{', start);
  // Walk braces, respecting strings, to find the end of the object literal.
  let depth = 0, inStr = false, esc = false;
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try { return JSON.parse(html.slice(from, i + 1)); } catch { return null; }
    }
  }
  return null;
}

// Collect video IDs and continuation tokens from any ytInitialData-like tree.
function walk(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return; }
  const lockup = node.lockupViewModel;
  if (lockup?.contentId && ID_RE.test(lockup.contentId)) {
    const title = lockup.metadata?.lockupMetadataViewModel?.title?.content;
    out.items.set(lockup.contentId, { title });
  }
  const shorts = node.shortsLockupViewModel;
  if (shorts) {
    const id = shorts.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
    if (id && ID_RE.test(id)) out.items.set(id, { title: shorts.overlayMetadata?.primaryText?.content });
  }
  const vr = node.videoRenderer || node.gridVideoRenderer || node.reelItemRenderer;
  if (vr?.videoId && ID_RE.test(vr.videoId)) {
    out.items.set(vr.videoId, { title: vr.title?.runs?.[0]?.text || vr.headline?.simpleText });
  }
  const token = node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
  if (token) out.tokens.push(token);
  for (const k of Object.keys(node)) {
    if (k !== 'lockupViewModel' && k !== 'shortsLockupViewModel') walk(node[k], out);
  }
}

async function fetchTab(channelId, tab) {
  const items = new Map();
  const { status, text } = await getText(`https://www.youtube.com/channel/${channelId}/${tab}`);
  if (status !== 200) { log(`tab ${tab} ${status}`); return items; }
  const data = extractJson(text, 'var ytInitialData');
  const apiKey = (text.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1];
  const clientVersion = (text.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || '2.20241101.00.00';
  if (!data) return items;

  // Only walk the selected tab so related-channel shelves are ignored.
  const selected = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find((t) => t.tabRenderer?.selected);
  // A channel without a Shorts tab serves its Home tab instead; skip that.
  const tabUrl = selected?.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
  if (!selected || !tabUrl.endsWith(`/${tab}`)) {
    log(`tab ${tab} not present for ${channelId}`);
    return items;
  }
  let out = { items, tokens: [] };
  walk(selected, out);

  let pages = 0;
  while (out.tokens.length && pages < 50) {
    const token = out.tokens.shift();
    pages++;
    await sleep(300);
    const res = await fetch(`https://www.youtube.com/youtubei/v1/browse${apiKey ? `?key=${apiKey}` : ''}`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion, hl: 'en' } }, continuation: token }),
    });
    if (!res.ok) { log(`browse continuation ${res.status}`); break; }
    const json = await res.json();
    const next = { items, tokens: [] };
    walk(json.onResponseReceivedActions || json, next);
    out.tokens.push(...next.tokens);
  }
  return items;
}

// ---------------------------------------------------------------------------
// 3. Watch page enrichment
// ---------------------------------------------------------------------------
// innertube /player returns microformat (publishDate) without the captcha
// wall that watch pages hit after a burst of requests.
async function fetchPlayer(id) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20241101.00.00', hl: 'en' } }, videoId: id }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchWatch(id) {
  try {
    let pr = await fetchPlayer(id).catch(() => null);
    if (!pr?.microformat) {
      const { status, text } = await getText(`https://www.youtube.com/watch?v=${id}`);
      if (status !== 200) return null;
      pr = extractJson(text, 'var ytInitialPlayerResponse');
    }
    const vd = pr?.videoDetails || {};
    const mf = pr?.microformat?.playerMicroformatRenderer || {};
    return {
      title: vd.title || mf.title?.simpleText,
      description: vd.shortDescription || mf.description?.simpleText || '',
      published_at: mf.publishDate || mf.uploadDate || null,
      duration_sec: vd.lengthSeconds ? Number(vd.lengthSeconds) : null,
      channel_id: vd.channelId || mf.externalChannelId || null,
    };
  } catch (e) {
    log('watch failed', id, e.message);
    return null;
  }
}

async function mapLimit(list, limit, fn) {
  const results = new Array(list.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < list.length) {
        const idx = i++;
        results[idx] = await fn(list[idx], idx);
      }
    })
  );
  return results;
}

// ---------------------------------------------------------------------------
// Portfolio videos (anon read)
// ---------------------------------------------------------------------------
export function parseYouTubeId(input = '') {
  const s = String(input).trim();
  if (ID_RE.test(s)) return s;
  const m =
    s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    s.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function fetchPortfolio() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portfolio_projects?select=title,video_url,description,status&status=eq.published`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) { log('portfolio read', res.status); return []; }
    const rows = await res.json();
    return rows
      .map((r) => ({ ...r, youtube_id: parseYouTubeId(r.video_url) }))
      .filter((r) => r.youtube_id);
  } catch (e) {
    log('portfolio read failed', e.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const trim500 = (s = '') => {
  const t = s.trim();
  return t.length <= 500 ? t : t.slice(0, 499).trimEnd() + '…';
};
export const slugify = (s = '') =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

const sqlStr = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/\u0000/g, '').replace(/'/g, "''")}'`);
const sqlArr = (arr) => (arr?.length ? `array[${arr.map(sqlStr).join(',')}]::text[]` : `'{}'::text[]`);
const sqlNum = (n) => (Number.isFinite(n) ? String(n) : 'null');

function toSql(rows) {
  const header = `-- Generated by scripts/fetch-youtube.mjs on ${new Date().toISOString()}
-- Seeds public.videos. Safe to re-run: existing youtube_id rows are left alone.
-- Requires supabase/migrations/20261108_2_hub_schema.sql.
-- Rows: ${rows.length} (${rows.filter((r) => r.brand === 'jooonbon').length} jooonbon, ${rows.filter((r) => r.brand === 'bonpoints').length} bonpoints; ${rows.filter((r) => r.format === 'short').length} shorts)
`;
  const cols = '(youtube_id, slug, title, description, brand, format, tags, published_at, duration_sec, featured, status)';
  const values = rows
    .map(
      (r) =>
        `  (${sqlStr(r.youtube_id)}, ${sqlStr(r.slug)}, ${sqlStr(r.title)}, ${sqlStr(r.description)}, ${sqlStr(r.brand)}, ${sqlStr(r.format)}, ${sqlArr(r.tags)}, ${r.published_at ? `${sqlStr(r.published_at)}::timestamptz` : 'null'}, ${sqlNum(r.duration_sec)}, false, 'published')`
    )
    .join(',\n');
  // Slugs must be unique too; the second clause skips a row whose slug already exists.
  return `${header}
begin;

insert into videos ${cols}
select v.* from (values
${values}
) as v ${cols}
where not exists (select 1 from videos x where x.slug = v.slug)
on conflict (youtube_id) do nothing;

commit;
`;
}

// ---------------------------------------------------------------------------
async function main() {
  const byId = new Map();
  const counts = {};

  for (const ch of CHANNELS) {
    const found = await findChannelId(ch.handles);
    if (!found) { log(`no channel id for ${ch.brand}`); continue; }
    log(`${ch.brand}: ${found.id} (${found.url})`);

    const rss = await fetchRss(found.id);
    const longs = await fetchTab(found.id, 'videos');
    const shorts = await fetchTab(found.id, 'shorts');
    log(`${ch.brand}: rss ${rss.length}, /videos ${longs.size}, /shorts ${shorts.size}`);

    const add = (id, patch) => {
      const cur = byId.get(id) || { youtube_id: id, brand: ch.brand, tags: [] };
      byId.set(id, { ...cur, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== null && v !== '')) });
    };
    for (const v of rss) add(v.youtube_id, v);
    for (const [id, v] of longs) add(id, { title: byId.get(id)?.title || v.title, format: 'long' });
    for (const [id, v] of shorts) add(id, { title: byId.get(id)?.title || v.title, format: 'short' });
    counts[ch.brand] = { channel_id: found.id, rss: rss.length, long: longs.size, short: shorts.size };
  }

  const portfolio = await fetchPortfolio();
  for (const p of portfolio) {
    const cur = byId.get(p.youtube_id);
    if (cur) {
      if (!cur.tags.includes('client-work')) cur.tags = [...cur.tags, 'client-work'];
      continue;
    }
    byId.set(p.youtube_id, {
      youtube_id: p.youtube_id,
      brand: 'jooonbon',
      format: /\/shorts\//.test(p.video_url) ? 'short' : 'long',
      title: (p.title || '').trim(),
      description: stripHtml(p.description || ''),
      tags: ['client-work'],
      fromPortfolio: true,
    });
  }
  counts.portfolio = portfolio.length;

  // Enrich anything without an exact date, description or length.
  const list = [...byId.values()];
  await mapLimit(list, 4, async (v) => {
    if (v.published_at && v.description !== undefined && v.duration_sec) return;
    let w = null;
    for (let attempt = 0; attempt < 4 && !w?.published_at; attempt++) {
      if (attempt) await sleep(1000 * attempt);
      w = await fetchWatch(v.youtube_id);
    }
    if (!w) return;
    v.title = v.title || w.title;
    if (!v.description && w.description) v.description = w.description;
    v.published_at = v.published_at || w.published_at;
    v.duration_sec = v.duration_sec || w.duration_sec;
  });

  // Final shape + unique slugs.
  const used = new Set();
  const rows = list
    .filter((v) => v.title)
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')))
    .map((v) => {
      let base = slugify(v.title) || v.youtube_id.toLowerCase();
      let slug = base;
      if (used.has(slug)) slug = `${base}-${v.youtube_id.toLowerCase()}`;
      used.add(slug);
      return {
        youtube_id: v.youtube_id,
        slug,
        title: v.title.trim().slice(0, 300),
        description: trim500(v.description || ''),
        brand: v.brand,
        format: v.format || 'long',
        tags: v.tags || [],
        published_at: v.published_at || null,
        duration_sec: v.duration_sec || null,
      };
    });

  const sql = toSql(rows);
  if (process.argv.includes('--stdout')) {
    process.stdout.write(sql);
  } else {
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, sql);
    log(`wrote ${OUT}`);
  }
  log('counts', JSON.stringify({ ...counts, total: rows.length, missing_date: rows.filter((r) => !r.published_at).length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
