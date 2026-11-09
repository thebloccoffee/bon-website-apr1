// Places on the jooonbon world map. Plain ESM with no imports, so the server
// (api/page.js SEO, api/sitemap.js) can use it as well as the app.
//
// A place's films and posts are found by matching `match` against video titles
// and tags and post titles/locations. A country also picks up everything its
// cities match. To add a trip: add the city (and country if new), then a trip.

export const COUNTRIES = [
  { slug: 'canada', name: 'Canada', geo: 'Canada', code: 'CAN', match: /\bcanada\b|\bb\.?c\.?\b|british columbia/i },
  { slug: 'usa', name: 'USA', geo: 'United States of America', code: 'USA', match: /\busa\b|united states|america\b/i },
  { slug: 'vietnam', name: 'Vietnam', geo: 'Vietnam', code: 'VNM', match: /vietnam|việt nam/i },
  { slug: 'china', name: 'China', geo: 'China', code: 'CHN', match: /\bchina\b|chinese/i },
  { slug: 'philippines', name: 'Philippines', geo: 'Philippines', code: 'PHL', match: /philippin|filipino|pinoy|cebu|boracay|palawan|bohol/i },
  { slug: 'thailand', name: 'Thailand', geo: 'Thailand', code: 'THA', match: /thailand|\bthai\b/i },
  { slug: 'indonesia', name: 'Indonesia', geo: 'Indonesia', code: 'IDN', match: /indonesia/i, status: 'soon' },
  { slug: 'south-korea', name: 'South Korea', geo: 'South Korea', code: 'KOR', match: /korea/i, status: 'soon' },
  { slug: 'taiwan', name: 'Taiwan', geo: 'Taiwan', code: 'TWN', match: /taiwan/i, status: 'soon' },
  { slug: 'japan', name: 'Japan', geo: 'Japan', code: 'JPN', match: /japan/i, status: 'soon' },
];

// status: 'filmed' (default) | 'edit' (footage in the edit) | 'soon' (visited, nothing published yet)
export const PLACES = [
  { slug: 'vancouver', name: 'Vancouver', country: 'canada', lat: 49.28, lng: -123.12, match: /vancouver|seymour|pump peak|squamish|north van|shipyards|coquitlam|lafarge|gastown|stanley park|britann?ia|deep cove|alpine meadows/i },
  { slug: 'hope-bc', name: 'Hope, BC', country: 'canada', lat: 49.38, lng: -121.44, labelK: 12, match: /othello|hope, bc|kawkawa/i },
  { slug: 'wells-gray', name: 'Wells Gray', country: 'canada', lat: 51.9, lng: -120.0, match: /wells gray/i },
  { slug: 'yoho', name: 'Yoho National Park', country: 'canada', lat: 51.38, lng: -116.53, match: /yoho|natural bridge|emerald lake/i },
  { slug: 'banff', name: 'Banff', country: 'canada', lat: 51.18, lng: -115.57, labelK: 16, match: /banff|rocky mountaineer|lake louise/i },
  { slug: 'new-york', name: 'New York', country: 'usa', lat: 40.71, lng: -74.0, match: /new york|\bnyc\b|manhattan|brooklyn/i },
  { slug: 'hanoi', name: 'Hanoi', country: 'vietnam', lat: 21.03, lng: 105.85, match: /hanoi|hà nội/i },
  { slug: 'sapa', name: 'Sapa', country: 'vietnam', lat: 22.34, lng: 103.84, match: /sapa|cat cat/i },
  { slug: 'da-nang', name: 'Da Nang', country: 'vietnam', lat: 16.05, lng: 108.22, match: /da ?nang/i },
  { slug: 'hoi-an', name: 'Hoi An', country: 'vietnam', lat: 15.88, lng: 108.33, labelK: 14, match: /hoi an|hội an|coconut forest|bay mau/i },
  { slug: 'nha-trang', name: 'Nha Trang', country: 'vietnam', lat: 12.24, lng: 109.19, match: /nha trang/i, status: 'edit' },
  { slug: 'saigon', name: 'Saigon', country: 'vietnam', lat: 10.76, lng: 106.66, match: /saigon|ho chi minh|bui vien/i, status: 'edit' },
  { slug: 'xiamen', name: 'Xiamen', country: 'china', lat: 24.48, lng: 118.09, match: /xiamen/i },
  { slug: 'zhangjiajie', name: 'Zhangjiajie', country: 'china', lat: 29.32, lng: 110.43, match: /zhangjiajie|bailong/i },
  { slug: 'manila', name: 'Manila', country: 'philippines', lat: 14.6, lng: 120.98, match: /manila/i },
  { slug: 'bangkok', name: 'Bangkok', country: 'thailand', lat: 13.75, lng: 100.5, match: /bangkok/i },
  { slug: 'bali', name: 'Bali', country: 'indonesia', lat: -8.41, lng: 115.19, match: /\bbali\b/i, status: 'soon' },
  { slug: 'seoul', name: 'Seoul', country: 'south-korea', lat: 37.57, lng: 126.98, match: /seoul/i, status: 'soon' },
  { slug: 'taipei', name: 'Taipei', country: 'taiwan', lat: 25.03, lng: 121.56, labelK: 12, match: /taipei/i, status: 'soon' },
];

// Dashed trip routes drawn on the map, as ordered city slugs.
export const ROUTES = [
  ['hanoi', 'da-nang', 'nha-trang', 'saigon'],
  ['vancouver', 'hope-bc', 'yoho', 'banff'],
];

// Where each country's "CODE count" label sits, in map units (1000 x 520).
export const LABELS = {
  canada: [168, 82], usa: [330, 150], vietnam: [712, 196], china: [826, 182],
  philippines: [842, 238], thailand: [728, 244],
};

// Trips in the order they happened, shown as clips on the homepage timeline.
// Colours follow DaVinci Resolve clip colours.
export const TRIPS = [
  { label: 'NYC', to: 'new-york', when: 'Jan 2025', color: '#3E63B4', ink: '#F4F1EA' },
  { label: 'Da Nang', to: 'da-nang', when: 'Apr 2025', color: '#2EA39B' },
  { label: 'China', to: 'zhangjiajie', when: 'May 2025', color: '#E8822E' },
  { label: 'Thailand', to: 'bangkok', when: 'Aug 2025', color: '#E6C243' },
  { label: 'Hanoi', to: 'hanoi', when: 'New Year', color: '#8F6FD1', ink: '#F4F1EA' },
  { label: 'Canada w/ parents', to: 'canada', when: 'Feb 2026', color: '#8E9B3C' },
  { label: 'Rocky Mountaineer', to: 'banff', when: 'Apr 2026', color: '#B49A72' },
  { label: 'Saigon', to: 'saigon', when: 'In the edit', status: 'edit' },
];

// Equal Earth projection fitted to public/world-map.json (1000 x 520 viewBox).
const SCALE = 184.48932215280678;
const TX = 500;
const TY = 285.7025960547544;
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;

export function project(lat, lng) {
  const l = (lng * Math.PI) / 180;
  const t = Math.asin(M * Math.sin((lat * Math.PI) / 180));
  const t2 = t * t;
  const t6 = t2 * t2 * t2;
  const x = (l * Math.cos(t)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [TX + SCALE * x, TY - SCALE * y];
}

export const MAP_W = 1000;
export const MAP_H = 520;

export const countryOf = (slug) => COUNTRIES.find((c) => c.slug === slug) || null;
export const placeOf = (slug) => PLACES.find((p) => p.slug === slug) || null;
export const citiesIn = (countrySlug) => PLACES.filter((p) => p.country === countrySlug);

/** A city or country by slug, as { kind, ...data }; null if it is neither. */
export function findPlace(slug) {
  const s = String(slug || '').toLowerCase();
  const city = placeOf(s);
  if (city) return { kind: 'city', ...city };
  const country = countryOf(s);
  if (country) return { kind: 'country', ...country };
  return null;
}

const textOf = (item) =>
  [item.title, item.location, item.city, item.destination, ...(Array.isArray(item.tags) ? item.tags : [])]
    .filter((v) => typeof v === 'string' && v)
    .join(' · ');

/** Items (videos or posts) that belong to a city or a country. */
export function itemsFor(place, items) {
  if (!place || !items?.length) return [];
  const patterns =
    place.kind === 'country'
      ? [place.match, ...citiesIn(place.slug).map((c) => c.match)]
      : [place.match];
  // An item tagged with a place in the admin (videos.destination) counts for
  // that place, its country, and nothing else.
  const own = place.kind === 'country' ? new Set([place.slug, ...citiesIn(place.slug).map((c) => c.slug)]) : new Set([place.slug]);
  const placeSlugs = new Set([...COUNTRIES.map((c) => c.slug), ...PLACES.map((p) => p.slug)]);
  return items.filter((it) => {
    const d = typeof it.destination === 'string' ? it.destination.toLowerCase() : '';
    if (d && placeSlugs.has(d)) return own.has(d);
    const t = textOf(it);
    return patterns.some((re) => re.test(t));
  });
}

/** Every place slug with its human title, for the sitemap and SEO. */
export function allPlaceRoutes() {
  return [
    ...COUNTRIES.map((c) => ({ slug: c.slug, title: c.name, kind: 'country' })),
    ...PLACES.map((p) => ({ slug: p.slug, title: p.name, kind: 'city', country: countryOf(p.country)?.name })),
  ];
}
