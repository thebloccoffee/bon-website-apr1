import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVideos } from '@/api/content';
import { fetchPosts } from '@/components/home/postsQuery';
import { COUNTRIES, PLACES, itemsFor } from '@/lib/places';

const dateOf = (it) => new Date(it.published_at || it.date_traveled || it.created_at || 0).getTime();

/**
 * Every jooonbon video and post, plus how many land in each country and city.
 * `latestCity` is the city of the newest item that matches one.
 */
export function useMapContent() {
  const { data: videos = [], isLoading: vLoading } = useQuery({
    queryKey: ['home-videos-all', 'jooonbon'],
    queryFn: () => getVideos({ brand: 'jooonbon' }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: posts = [], isLoading: pLoading } = useQuery({
    queryKey: ['brand-posts', 'jooonbon'],
    queryFn: () => fetchPosts({ brand: 'jooonbon' }),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const all = [...videos.map((v) => ({ ...v, _type: 'video' })), ...posts.map((p) => ({ ...p, _type: 'post' }))];
    const countryCounts = {};
    for (const c of COUNTRIES) {
      const n = itemsFor({ kind: 'country', ...c }, all).length;
      if (n) countryCounts[c.slug] = n;
    }
    const cityCounts = {};
    const cityFirst = {};
    for (const p of PLACES) {
      const items = itemsFor({ kind: 'city', ...p }, all);
      if (items.length) {
        cityCounts[p.slug] = items.length;
        cityFirst[p.slug] = Math.min(...items.map(dateOf).filter((t) => t > 0));
      }
    }
    const newest = [...all].sort((a, b) => dateOf(b) - dateOf(a));
    let latestCity = null;
    for (const it of newest) {
      const hit = PLACES.find((p) => itemsFor({ kind: 'city', ...p }, [it]).length);
      if (hit) { latestCity = hit.slug; break; }
    }
    return { videos, posts, all, countryCounts, cityCounts, cityFirst, latestCity, isLoading: vLoading || pLoading };
  }, [videos, posts, vLoading, pLoading]);
}

export const thumbFor = (v) =>
  v.format === 'short' ? `https://i.ytimg.com/vi/${v.youtube_id}/oar2.jpg` : `https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`;

export const watchUrl = (v) =>
  v.format === 'short' ? `https://www.youtube.com/shorts/${v.youtube_id}` : `https://www.youtube.com/watch?v=${v.youtube_id}`;

export const postUrl = (p) => `${p.brand === 'bonpoints' ? '/bonpoints/guides' : '/journal'}/${p.slug}`;
