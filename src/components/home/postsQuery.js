import { supabase } from '@/api/supabaseClient';
import { BRANDS } from '@/lib/brands';

// Journal-style post fetch that survives a database where the hub migration
// (brand, kind) or the city migration has not been applied yet. Tries the full
// column list first, then falls back to older column sets. Posts without a
// brand column count as jooonbon (the migration default).
const COLUMN_SETS = [
  'id,title,slug,excerpt,cover_image,location,city,coordinates,date_traveled,tags,brand,kind,created_at',
  'id,title,slug,excerpt,cover_image,location,city,coordinates,date_traveled,tags,created_at',
  'id,title,slug,excerpt,cover_image,location,coordinates,date_traveled,tags,created_at',
];

export async function fetchPosts({ brand, limit, orderBy = 'date_traveled', throwOnError = false } = {}) {
  let lastError = null;
  for (const cols of COLUMN_SETS) {
    let q = supabase
      .from('blog_posts')
      .select(cols)
      .eq('status', 'published')
      .order(orderBy, { ascending: false, nullsFirst: false });
    if (limit && !brand) q = q.limit(limit);
    const { data, error } = await q;
    if (!error) {
      let rows = (data || []).map((p) => ({ ...p, brand: p.brand || 'jooonbon' }));
      if (brand) rows = rows.filter((p) => p.brand === brand);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    }
    lastError = error;
    // 42703 = undefined column. Anything else is not a schema problem.
    if (error.code !== '42703' && !/column/i.test(error.message || '')) break;
  }
  if (throwOnError && lastError) throw lastError;
  if (lastError) console.warn('[posts]', lastError.message);
  return [];
}

export const brandName = (key) => BRANDS[key]?.name || BRANDS.jooonbon.name;
