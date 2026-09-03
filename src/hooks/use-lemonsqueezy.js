import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// lemon.js is loaded from index.html and auto-binds .lemonsqueezy-button links,
// but it initialises before React mounts, so re-run createLemonSqueezy() here.
// Checkout.Success hands back the full Order object client-side; we only use its
// identifier to find the receipt. Entitlement comes from the webhook, not this.
export function useLemonSqueezy() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.createLemonSqueezy?.();

    window.LemonSqueezy?.Setup({
      eventHandler: (event) => {
        if (event?.event !== 'Checkout.Success') return;
        const identifier = event?.data?.attributes?.identifier;
        if (!identifier) return;
        navigate(`/shop/success?order=${identifier}`);
      },
    });
  }, [navigate]);
}

// Adds the slug so the webhook can still match the product if a variant id
// is ever changed in the Lemon Squeezy dashboard.
export function buildCheckoutUrl(product) {
  if (!product?.ls_buy_url) return null;
  const url = new URL(product.ls_buy_url);
  url.searchParams.set('checkout[custom][product_slug]', product.slug);
  url.searchParams.set('embed', '1');
  url.searchParams.set('media', '0');
  return url.toString();
}
