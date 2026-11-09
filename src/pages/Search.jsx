import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { BRANDS } from '@/lib/brands';
import SearchBox from '@/components/shared/SearchBox';
import { useDebounce } from '@/hooks/use-debounce';

const KINDS = [
  { key: 'post', label: 'Posts' },
  { key: 'video', label: 'Videos' },
  { key: 'product', label: 'Products' },
];

const BRAND_CHIPS = [{ key: '', label: 'All' }, ...Object.values(BRANDS).map((b) => ({ key: b.key, label: b.name }))];

const hrefFor = (r) => {
  if (r.kind === 'post') return `/journal/${r.slug}`;
  if (r.kind === 'video') return `/videos?v=${encodeURIComponent(r.slug)}`;
  return `/shop/${r.slug}`;
};

/* ── Fallback: client-side search over published posts ──────────────────────
 * Used only when the search_site RPC is missing (hub migration not applied on
 * prod yet). Selects legacy columns only, because getPosts() also asks for
 * brand/kind, which do not exist until the migration runs. Remove this block
 * once 20261108_2_hub_schema.sql is live.
 */
let fallbackPostsPromise = null;
function loadFallbackPosts() {
  if (!fallbackPostsPromise) {
    fallbackPostsPromise = supabase
      .from('blog_posts')
      .select('title,slug,excerpt,cover_image,location,city,tags')
      .eq('status', 'published')
      .then(({ data, error }) => {
        if (error) {
          fallbackPostsPromise = null;
          throw error;
        }
        return data || [];
      });
  }
  return fallbackPostsPromise;
}

function fallbackSearch(posts, q, brand) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return posts
    .map((p) => {
      const postBrand = p.brand || 'jooonbon'; // migration default for existing posts
      if (brand && postBrand !== brand) return null;
      const title = (p.title || '').toLowerCase();
      const excerpt = (p.excerpt || '').toLowerCase();
      const place = `${p.location || ''} ${p.city || ''}`.toLowerCase();
      const tags = (p.tags || []).join(' ').toLowerCase();
      let rank = 0;
      for (const t of terms) {
        const score = (title.includes(t) ? 3 : 0) + (tags.includes(t) ? 2 : 0) + (place.includes(t) ? 2 : 0) + (excerpt.includes(t) ? 1 : 0);
        if (!score) return null; // every term must match somewhere
        rank += score;
      }
      return { kind: 'post', slug: p.slug, title: p.title, summary: p.excerpt, image: p.cover_image, brand: postBrand, rank };
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank);
}

async function runSearch(q, brand) {
  const { data, error } = await supabase.rpc('search_site', { q, brand_filter: brand || null });
  if (!error) return { rows: data || [], mode: 'rpc' };
  const posts = await loadFallbackPosts();
  return { rows: fallbackSearch(posts, q, brand), mode: 'fallback' };
}
/* ── end fallback ── */

function ResultRow({ r }) {
  const brandName = BRANDS[r.brand]?.name;
  return (
    <li>
      <Link
        to={hrefFor(r)}
        data-brand={r.brand === 'bonpoints' ? 'bonpoints' : undefined}
        className="group flex gap-4 py-5 border-b border-border focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
      >
        <div className={`shrink-0 overflow-hidden bg-muted ${r.kind === 'video' ? 'w-28 aspect-video' : 'w-20 h-20 md:w-24 md:h-24'}`}>
          {r.image ? (
            <img
              src={r.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-tk-xs tracking-[0.2em] uppercase text-muted-foreground">
            {KINDS.find((k) => k.key === r.kind)?.label.replace(/s$/, '')}
            {brandName ? ` · ${brandName}` : ''}
          </p>
          <h3 className="font-serif text-lg md:text-xl leading-snug mt-1 group-hover:underline underline-offset-4 decoration-1">
            {r.title}
          </h3>
          {r.summary ? (
            <p className="font-sans text-sm text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function Chip({ active, onClick, children, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`font-sans text-xs tracking-[0.15em] uppercase px-3 md:px-4 py-2.5 md:py-2 border transition-colors duration-200 ${
        active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const urlQ = (params.get('q') || '').trim();
  const brand = BRANDS[params.get('brand')] ? params.get('brand') : '';
  const [kind, setKind] = useState('all');

  // Input <-> URL sync. lastPushed tracks the q we last wrote so we can tell
  // our own writes apart from outside ones (back button, header search).
  const [input, setInput] = useState(params.get('q') || '');
  const debounced = useDebounce(input, 250);
  const lastPushed = useRef(urlQ);

  useEffect(() => {
    const next = debounced.trim();
    if (next === lastPushed.current) return;
    lastPushed.current = next;
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('q', next);
        else p.delete('q');
        return p;
      },
      { replace: true }
    );
  }, [debounced, setParams]);

  useEffect(() => {
    if (urlQ !== lastPushed.current) {
      lastPushed.current = urlQ;
      setInput(urlQ);
    }
  }, [urlQ]);

  const setBrand = (b) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (b) p.set('brand', b);
        else p.delete('brand');
        return p;
      },
      { replace: true }
    );

  useEffect(() => {
    document.title = urlQ ? `Search: ${urlQ} | Jon Bon Tabas` : 'Search | Jon Bon Tabas';
  }, [urlQ]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', urlQ, brand],
    queryFn: () => runSearch(urlQ, brand),
    enabled: urlQ.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const rows = useMemo(() => (urlQ ? data?.rows || [] : []), [data, urlQ]);
  const counts = useMemo(() => {
    const c = { all: rows.length };
    KINDS.forEach((k) => (c[k.key] = rows.filter((r) => r.kind === k.key).length));
    return c;
  }, [rows]);

  // Drop back to "all" if the active tab empties out.
  const activeKind = kind !== 'all' && counts[kind] === 0 ? 'all' : kind;
  const groups = KINDS.filter((k) => (activeKind === 'all' || activeKind === k.key) && counts[k.key] > 0);

  const pending = urlQ && (isFetching || input.trim() !== urlQ);
  let status = '';
  if (!urlQ) status = '';
  else if (pending && !data) status = 'Searching…';
  else if (isError) status = 'Search is not working right now. Try again in a moment.';
  else if (!rows.length) status = `No results for "${urlQ}".`;
  else status = `${rows.length} ${rows.length === 1 ? 'result' : 'results'} for "${urlQ}".`;

  return (
    <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen max-w-4xl mx-auto">
      <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1] mb-8">
        Search
      </h1>

      <SearchBox
        id="search-page-input"
        value={input}
        onValueChange={setInput}
        onSubmit={(q) => {
          setInput(q);
          lastPushed.current = q;
          setParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              if (q) p.set('q', q);
              else p.delete('q');
              return p;
            },
            { replace: true }
          );
        }}
        autoFocus
        slashToFocus
        placeholder="Try a city or a trip"
        className="mb-6"
      />

      <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Filter by brand">
        <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mr-2">Brand</span>
        {BRAND_CHIPS.map((b) => (
          <Chip key={b.key || 'all'} active={brand === b.key} onClick={() => setBrand(b.key)}>
            {b.label}
          </Chip>
        ))}
      </div>

      {urlQ && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2" role="group" aria-label="Filter by type">
          <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mr-2">Type</span>
          <Chip active={activeKind === 'all'} onClick={() => setKind('all')}>
            All ({counts.all})
          </Chip>
          {KINDS.filter((k) => counts[k.key] > 0).map((k) => (
            <Chip key={k.key} active={activeKind === k.key} onClick={() => setKind(k.key)}>
              {k.label} ({counts[k.key]})
            </Chip>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" aria-atomic="true" className="font-sans text-sm text-muted-foreground mt-6 min-h-[1.25rem]">
        {status}
      </p>

      {!urlQ && (
        <p className="font-serif text-lg text-muted-foreground mt-2 max-w-lg">
          Search journal posts, videos and shop products from jooonbon and bon.points.
        </p>
      )}

      {urlQ && !rows.length && !pending && !isError && (
        <p className="font-serif text-lg text-muted-foreground mt-2 max-w-lg">
          Check the spelling, try fewer words, or{' '}
          <Link to="/journal" className="underline underline-offset-4">
            browse the journal
          </Link>
          .
        </p>
      )}

      <div className={`transition-opacity duration-200 ${pending && data ? 'opacity-60' : 'opacity-100'}`} aria-busy={!!pending}>
        {groups.map((g) => (
          <section key={g.key} className="mt-8" aria-labelledby={`results-${g.key}`}>
            <h2
              id={`results-${g.key}`}
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground pb-3 border-b border-border"
            >
              {g.label} <span className="opacity-60">{counts[g.key]}</span>
            </h2>
            <ul>
              {rows
                .filter((r) => r.kind === g.key)
                .map((r) => (
                  <ResultRow key={`${r.kind}-${r.slug}`} r={r} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
