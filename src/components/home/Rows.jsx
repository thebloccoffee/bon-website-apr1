import React from 'react';
import VideoCard from '@/components/shared/VideoCard';
import ProductCard from '@/components/shared/ProductCard';
import { BrandLabel } from './Section';

// Grids for videos and products. Callers hide the whole section when empty.
export function VideoGrid({ videos, showBrand = false, glass = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-tk-6 md:gap-tk-8">
      {videos.map((v) => (
        <div key={v.id || v.youtube_id} className={glass ? 'bp-glass rounded-tk-xs p-tk-3' : ''}>
          {showBrand && (
            <div className="mb-tk-3">
              <BrandLabel brand={v.brand} />
            </div>
          )}
          <VideoCard video={v} />
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({ products, glass = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-tk-6 md:gap-tk-8">
      {products.map((p) => (
        <div key={p.id || p.slug} className={glass ? 'bp-glass rounded-tk-xs p-tk-3' : ''}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
