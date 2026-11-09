// Works out who runs checkout from the product's buy link.
// Default setup (2026-11-08): checkout on Stan Store; the site is the shop window.
// The built-in Stripe flow (webhook + /shop/thanks downloads) stays available
// for any product whose link is a Stripe Payment Link.
export function checkoutProvider(url) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === 'stan.store' || host.endsWith('.stan.store')) return { key: 'stan', name: 'Stan' };
  if (host.endsWith('gumroad.com')) return { key: 'gumroad', name: 'Gumroad' };
  if (host === 'buy.stripe.com' || host.endsWith('.stripe.com')) return { key: 'stripe', name: 'Stripe' };
  return { key: 'other', name: host.replace(/^www\./, '') };
}
