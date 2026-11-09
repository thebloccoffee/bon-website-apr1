import React, { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { findPlace } from '@/lib/places';

const PlacePage = lazy(() => import('./PlacePage'));
const TravelDestination = lazy(() => import('./TravelDestination'));

// /travel/:slug: a place on the world map if we know it, else a destination
// from the database (older pages keep working).
export default function TravelSlug() {
  const { slug } = useParams();
  const place = findPlace(slug);
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      {place ? <PlacePage key={place.slug} place={place} /> : <TravelDestination />}
    </Suspense>
  );
}
