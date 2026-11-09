import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/api/content';

// True once at least one product is published. Nav and footer hide the
// Shop link until then, so the site never links to an empty shop.
export function useHasProducts() {
  const { data = [] } = useQuery({
    queryKey: ['products', 'any-published'],
    queryFn: () => getProducts({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
  });
  return data.length > 0;
}

export const withoutShop = (links, hasProducts) =>
  hasProducts ? links : links.filter((l) => (l.path || l.to) !== '/shop');
