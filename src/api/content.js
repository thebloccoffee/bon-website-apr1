/**
 * Public read helpers (anon key, RLS-limited to published rows).
 * Every helper returns [] / null on error so pages still render if a table
 * is missing or empty. Use with @tanstack/react-query.
 */
import { supabase } from '@/api/supabaseClient';

const safe = async (query, fallback) => {
  try {
    const { data, error } = await query;
    if (error) {
      console.warn('[content]', error.message);
      return fallback;
    }
    return data ?? fallback;
  } catch (e) {
    console.warn('[content]', e);
    return fallback;
  }
};

export function getPosts({ brand, kind, tag, location, limit } = {}) {
  let q = supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,cover_image,location,city,coordinates,date_traveled,tags,brand,kind,created_at')
    .eq('status', 'published')
    .order('date_traveled', { ascending: false, nullsFirst: false });
  if (brand) q = q.eq('brand', brand);
  if (kind) q = q.eq('kind', kind);
  if (tag) q = q.contains('tags', [tag]);
  if (location) q = q.eq('location', location);
  if (limit) q = q.limit(limit);
  return safe(q, []);
}

export function getVideos({ brand, format, featured, tag, destination, limit } = {}) {
  let q = supabase
    .from('videos')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });
  if (brand) q = q.eq('brand', brand);
  if (format) q = q.eq('format', format);
  if (featured) q = q.eq('featured', true);
  if (tag) q = q.contains('tags', [tag]);
  if (destination) q = q.eq('destination', destination);
  if (limit) q = q.limit(limit);
  return safe(q, []);
}

export function getProducts({ brand, featured, limit } = {}) {
  let q = supabase
    .from('shop_products')
    .select('*')
    .eq('status', 'published')
    .order('order', { ascending: true });
  if (brand) q = q.eq('brand', brand);
  if (featured) q = q.eq('featured', true);
  if (limit) q = q.limit(limit);
  return safe(q, []);
}

export function getProduct(slug) {
  return safe(
    supabase.from('shop_products').select('*').eq('slug', slug).eq('status', 'published').maybeSingle(),
    null
  );
}

export function getDestinations() {
  return safe(
    supabase.from('destinations').select('*').eq('status', 'published').order('order', { ascending: true }),
    []
  );
}

export function getDestination(slug) {
  return safe(
    supabase.from('destinations').select('*').eq('slug', slug).eq('status', 'published').maybeSingle(),
    null
  );
}

export function searchSite(q, brand = null) {
  if (!q || !q.trim()) return Promise.resolve([]);
  return safe(supabase.rpc('search_site', { q: q.trim(), brand_filter: brand }), []);
}
