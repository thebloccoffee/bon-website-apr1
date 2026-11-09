import { BRANDS } from '@/lib/brands';

export const CATEGORY_LABELS = {
  lut: 'LUTs',
  preset: 'Presets',
  guide: 'Guides',
  bundle: 'Bundles',
};

export const CATEGORY_OPTIONS = [
  { value: 'lut', label: 'LUT' },
  { value: 'preset', label: 'Preset' },
  { value: 'guide', label: 'Guide' },
  { value: 'bundle', label: 'Bundle' },
];

export const categoryLabel = (value) =>
  CATEGORY_LABELS[value] ?? (value ? value.replace(/_/g, ' ') : '');

// Unknown or missing brand falls back to the site default (jooonbon).
export const brandOf = (product) => BRANDS[product?.brand] ?? BRANDS.jooonbon;

// Props to spread on a wrapper so bon.points products pick up their scope.
export const brandScope = (product) =>
  product?.brand === 'bonpoints' ? { 'data-brand': 'bonpoints' } : {};

export const faqItems = (product) =>
  (Array.isArray(product?.faq) ? product.faq : []).filter((f) => f && f.q && f.a);
