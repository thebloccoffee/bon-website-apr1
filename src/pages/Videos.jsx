import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getVideos } from '@/api/content';
import { BRANDS, BRAND_KEYS } from '@/lib/brands';
import VideoCard from '@/components/shared/VideoCard';
import Seo from '@/components/shared/Seo';

const FORMATS = [
  { key: 'long', label: 'Videos' },
  { key: 'short', label: 'Shorts' },
];

const chipClass = (active) =>
  `font-sans text-tk-sm uppercase tracking-[0.15em] px-tk-4 py-tk-3 border transition-colors duration-fast ${
    active
      ? 'border-foreground bg-foreground text-background'
      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
  }`;

const prettyTag = (t) => t.replace(/[-_]/g, ' ');

// /videos = jooonbon "Films"; /bonpoints/videos reuses this with lockedBrand="bonpoints".
const COPY = {
  jooonbon: {
    eyebrow: 'Watch',
    title: 'Films',
    intro: 'Travel films and shorts, including scenes recreated where the movies were made.',
    seo: 'Travel films and shorts by jooonbon, Jon Bon Tabas.',
  },
  bonpoints: {
    eyebrow: 'Watch',
    title: 'Videos',
    intro: 'Credit card, points and travel money videos from bon.points.',
    seo: 'Credit card, points and travel money videos from bon.points.',
  },
};

export default function Videos({ lockedBrand = 'jooonbon' }) {
  const [params, setParams] = useSearchParams();
  const brand = lockedBrand || (BRAND_KEYS.includes(params.get('brand')) ? params.get('brand') : null);
  const copy = COPY[lockedBrand] || COPY.jooonbon;
  const format = params.get('format') === 'short' ? 'short' : 'long';
  const tag = params.get('tag') || null;

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos-all'],
    queryFn: () => getVideos(),
    staleTime: 5 * 60 * 1000,
  });

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A tag picked under one brand/format may not exist under another.
    if (key !== 'tag') next.delete('tag');
    setParams(next, { replace: true });
  };

  const scoped = useMemo(
    () => videos.filter((v) => (!brand || v.brand === brand) && (v.format || 'long') === format),
    [videos, brand, format]
  );

  const tags = useMemo(() => {
    const counts = new Map();
    scoped.forEach((v) => (v.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [scoped]);

  const shown = useMemo(() => (tag ? scoped.filter((v) => (v.tags || []).includes(tag)) : scoped), [scoped, tag]);
  const formatCounts = useMemo(() => {
    const base = videos.filter((v) => !brand || v.brand === brand);
    return { long: base.filter((v) => (v.format || 'long') === 'long').length, short: base.filter((v) => v.format === 'short').length };
  }, [videos, brand]);

  const isShorts = format === 'short';
  const gridClass = isShorts
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-tk-5 gap-y-10'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-tk-7 gap-y-12';

  return (
    <div className="pt-28 pb-24 min-h-screen" data-brand={brand === 'bonpoints' ? 'bonpoints' : undefined}>
      <Seo title={copy.title} description={copy.seo} />

      <header className="px-6 md:px-16 mb-10 md:mb-14">
        <p className="font-sans text-tk-xs uppercase tracking-[0.3em] text-muted-foreground mb-tk-4">{copy.eyebrow}</p>
        <h1 className="font-serif text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">{copy.title}</h1>
        <p className="font-serif text-lg text-muted-foreground mt-4 max-w-xl">
          {copy.intro}
        </p>
      </header>

      <div className="px-6 md:px-16 mb-10 space-y-tk-5">
        <div className="flex flex-wrap items-center gap-tk-3" role="group" aria-label="Filter by brand">
          {!lockedBrand && (<>
          <button type="button" className={chipClass(!brand)} aria-pressed={!brand} onClick={() => update('brand', null)}>
            All
          </button>
          {BRAND_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={chipClass(brand === k)}
              aria-pressed={brand === k}
              onClick={() => update('brand', brand === k ? null : k)}
            >
              {BRANDS[k].name}
            </button>
          ))}

          <span className="mx-tk-3 h-6 w-px bg-border hidden sm:block" aria-hidden="true" />
          </>)}

          <div className="inline-flex border border-border" role="group" aria-label="Video length">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={format === f.key}
                onClick={() => update('format', f.key === 'long' ? null : f.key)}
                className={`font-sans text-tk-sm uppercase tracking-[0.15em] px-tk-4 py-tk-3 transition-colors duration-fast ${
                  format === f.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
                {!isLoading && <span className="ml-tk-2 opacity-60">{formatCounts[f.key]}</span>}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-tk-2" role="group" aria-label="Filter by tag">
            <span className="font-sans text-tk-xs uppercase tracking-[0.2em] text-muted-foreground mr-tk-2">Tags</span>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => update('tag', tag === t ? null : t)}
                className={`font-sans text-tk-sm px-tk-3 py-tk-1 rounded-tk-pill border transition-colors duration-fast ${
                  tag === t
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
                }`}
              >
                {prettyTag(t)}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="px-6 md:px-16" aria-live="polite">
        {isLoading ? (
          <div className={gridClass}>
            {Array.from({ length: isShorts ? 8 : 6 }, (_, i) => (
              <div key={i} className="space-y-tk-4">
                <div className={`bg-muted animate-pulse ${isShorts ? 'aspect-[9/16]' : 'aspect-video'}`} />
                <div className="h-3 w-1/3 bg-muted animate-pulse" />
                <div className="h-4 w-4/5 bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState hasAny={videos.length > 0} brand={brand} onReset={() => setParams({}, { replace: true })} />
        ) : (
          <div className={gridClass}>
            {shown.map((v, i) => (
              <VideoCard key={v.id || v.youtube_id} video={v} size={isShorts ? 'sm' : 'md'} priority={i === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ hasAny, brand, onReset }) {
  const channels = brand ? [BRANDS[brand]] : BRAND_KEYS.map((k) => BRANDS[k]);
  return (
    <div className="py-20 text-center max-w-md mx-auto">
      <p className="font-serif text-2xl font-light">
        {hasAny ? 'Nothing matches these filters.' : 'Videos are on their way here.'}
      </p>
      <p className="font-sans text-tk-lg text-muted-foreground mt-tk-4">
        {hasAny ? 'Try another brand, tag or length.' : 'Until then, everything is on YouTube.'}
      </p>
      <div className="mt-tk-8 flex flex-wrap justify-center gap-tk-3">
        {hasAny && (
          <button type="button" onClick={onReset} className={chipClass(false)}>
            Clear filters
          </button>
        )}
        {channels.map((b) => (
          <a key={b.key} href={b.youtube} target="_blank" rel="noopener noreferrer" className={chipClass(false)}>
            {b.name} on YouTube
          </a>
        ))}
      </div>
    </div>
  );
}
