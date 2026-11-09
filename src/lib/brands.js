// Two brands only. Destinations/travel are a shared topic, never a brand.
export const BRANDS = {
  jooonbon: {
    key: 'jooonbon',
    name: 'jooonbon',
    tagline: 'Travel Filmmaker',
    path: '/',
    instagram: 'https://instagram.com/jooonbon',
    youtube: 'https://youtube.com/jonbontabas',
  },
  bonpoints: {
    key: 'bonpoints',
    name: 'bon.points',
    tagline: 'Credit cards, finance and travel tips',
    path: '/bonpoints',
    instagram: 'https://instagram.com/bonpoints',
    youtube: 'https://youtube.com/@bonpoints',
  },
};

export const BRAND_KEYS = Object.keys(BRANDS);

export const formatPrice = (cents, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format((cents || 0) / 100);

// jooonbon posts live in /journal; bon.points posts live in /bonpoints/guides.
export const postPath = (post) =>
  post?.brand === 'bonpoints'
    ? `/bonpoints/guides/${post.slug || post.id}`
    : `/journal/${post?.slug || post?.id}`;
