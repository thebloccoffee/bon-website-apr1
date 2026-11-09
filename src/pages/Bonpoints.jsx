import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVideos } from '@/api/content';
import { fetchPosts } from '@/components/home/postsQuery';
import {
  BpHero,
  BpTopics,
  BpDisclosures,
  BpVideos,
  BpPillars,
  BpGuides,
  BpNewsletter,
} from '@/components/bonpoints/BpSections';

// bon.points landing page, built on the v2 brand bible: Ink/Bone, glass, Inter,
// "come into focus" motion. Rows with no data hide themselves.
export default function Bonpoints() {
  const { data: videos = [] } = useQuery({
    queryKey: ['brand-videos', 'bonpoints'],
    queryFn: () => getVideos({ brand: 'bonpoints' }),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ['brand-posts', 'bonpoints'],
    queryFn: () => fetchPosts({ brand: 'bonpoints' }),
  });

  return (
    <div className="bg-[var(--bp-ink)] text-[var(--bp-bone)] font-sans -mt-px">
      <BpHero />
      <BpTopics />
      <BpDisclosures />
      <BpVideos videos={videos} />
      <BpPillars />
      <BpGuides posts={posts} />
      <BpNewsletter />
    </div>
  );
}
