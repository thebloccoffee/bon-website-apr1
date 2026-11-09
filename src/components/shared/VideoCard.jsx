import React from 'react';
import { format as formatDate } from 'date-fns';
import { BRANDS } from '@/lib/brands';
import YouTubeFacade from './YouTubeFacade';

const SIZES = {
  sm: { title: 'text-tk-xl', sizes: '(min-width: 1024px) 25vw, 50vw' },
  md: { title: 'text-tk-3xl', sizes: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' },
  lg: { title: 'text-tk-4xl md:text-3xl', sizes: '(min-width: 1024px) 66vw, 100vw' },
};

const watchUrl = (v) =>
  v.format === 'short' ? `https://www.youtube.com/shorts/${v.youtube_id}` : `https://www.youtube.com/watch?v=${v.youtube_id}`;

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Video tile for the `videos` table row shape
 * (youtube_id, title, brand, format, published_at, ...).
 *
 * Props: video, size ('sm' | 'md' | 'lg'), priority (eager thumbnail), playable
 * (false renders a plain link to YouTube instead of the inline player).
 */
export default function VideoCard({ video, size = 'md', priority = false, playable = true }) {
  if (!video?.youtube_id) return null;
  const s = SIZES[size] || SIZES.md;
  const brand = BRANDS[video.brand];
  const date = safeDate(video.published_at);
  const isShort = video.format === 'short';

  return (
    <article data-brand={video.brand === 'bonpoints' ? 'bonpoints' : undefined} className="group flex flex-col gap-tk-4">
      {playable ? (
        <YouTubeFacade
          youtubeId={video.youtube_id}
          title={video.title}
          format={video.format}
          priority={priority}
          sizes={s.sizes}
        />
      ) : (
        <a href={watchUrl(video)} target="_blank" rel="noopener noreferrer" aria-label={`Watch on YouTube: ${video.title}`}>
          <img
            src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
            alt=""
            width={480}
            height={360}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={`w-full object-cover ${isShort ? 'aspect-[9/16]' : 'aspect-video'}`}
          />
        </a>
      )}

      <div className="flex flex-col gap-tk-2">
        <p className="font-sans text-tk-xs uppercase tracking-[0.2em] text-muted-foreground">
          {brand?.name || video.brand}
          {isShort && <span> · Short</span>}
          {date && (
            <>
              {' · '}
              <time dateTime={date.toISOString()}>{formatDate(date, 'MMM d, yyyy')}</time>
            </>
          )}
        </p>
        <h3 className={`font-serif font-light leading-snug text-foreground ${s.title}`}>
          <a
            href={watchUrl(video)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors duration-fast line-clamp-3"
          >
            {video.title}
          </a>
        </h3>
      </div>
    </article>
  );
}
