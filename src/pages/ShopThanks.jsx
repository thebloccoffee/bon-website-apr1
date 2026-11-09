import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import Seo from '@/components/shared/Seo';

// Stripe redirects here with ?session_id=cs_... Delivery is decided by the
// signed webhook only; this page just reports what /api/order says.
//   confirming: webhook a few seconds behind, poll fast
//   pending:    delayed method (GCash) not settled, poll slowly
const FAST_MS = 1500;
const SLOW_MS = 10000;
const MAX_FAST = 20;
const MAX_SLOW = 30;

const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

function Heading({ children }) {
  return <h1 className="font-sans text-3xl md:text-5xl font-light tracking-[-0.02em] leading-[1.1]">{children}</h1>;
}

function Note({ children }) {
  return <p className="font-serif text-tk-lg text-muted-foreground mt-tk-4">{children}</p>;
}

export default function ShopThanks() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const valid = SESSION_RE.test(sessionId);
  const [order, setOrder] = useState(null);
  const [state, setState] = useState(valid ? 'loading' : 'missing');

  useEffect(() => {
    if (!valid) return undefined;
    let cancelled = false;
    let timer;
    let fast = 0;
    let slow = 0;

    const poll = async () => {
      if (cancelled) return;
      let status = 'error';
      try {
        const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.status) {
          status = json.status;
          if (!cancelled) setOrder(json);
        }
      } catch {
        // network hiccup, retry below
      }
      if (cancelled) return;

      if (status === 'paid' || status === 'unpaid' || status === 'failed' || status === 'refunded') {
        setState(status);
        return;
      }
      if (status === 'pending') {
        setState('pending');
        if (++slow >= MAX_SLOW) return;
        timer = setTimeout(poll, SLOW_MS);
        return;
      }
      // confirming or error
      if (++fast >= MAX_FAST) {
        setState('slow');
        return;
      }
      timer = setTimeout(poll, FAST_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, valid]);

  const files = order?.files || [];

  return (
    <div className="pt-36 pb-32 px-4 md:px-16 min-h-screen">
      <Seo title="Thank you" description="Your order" />
      <div className="max-w-xl mx-auto text-center" aria-live="polite">
        {state === 'loading' && (
          <>
            <Loader2 size={22} className="mx-auto animate-spin text-muted-foreground" aria-hidden="true" />
            <Note>Checking your payment. This usually takes a few seconds.</Note>
          </>
        )}

        {state === 'paid' && (
          <>
            <Heading>Thank you{order?.first_name ? `, ${order.first_name}` : ''}.</Heading>
            <Note>
              {order?.order_number ? `Order #${order.order_number}` : 'Your order'}
              {order?.product?.title ? ` · ${order.product.title}` : ''}. We also emailed you these links.
            </Note>

            <div className="mt-12 space-y-tk-3 text-left">
              {files.length === 0 && (
                <p className="font-serif text-tk-md text-muted-foreground text-center">
                  Your files are still being attached. Check your email in a few minutes, or reply to your Stripe
                  receipt and I'll send them over.
                </p>
              )}
              {files.map((f) =>
                f.expired || f.remaining === 0 ? (
                  <div key={f.url} className="flex items-center justify-between gap-tk-4 border border-border rounded-tk-xs px-6 py-5 opacity-60">
                    <span className="font-sans text-tk-md">{f.label}</span>
                    <span className="font-sans text-tk-xs text-muted-foreground whitespace-nowrap">
                      {f.expired ? 'Link expired' : 'Download limit reached'}
                    </span>
                  </div>
                ) : (
                  <a
                    key={f.url}
                    href={f.url}
                    className="flex items-center justify-between gap-tk-4 border border-border rounded-tk-xs px-6 py-5 hover:bg-muted transition-colors duration-300"
                  >
                    <span className="flex items-center gap-tk-3 font-sans text-tk-md min-w-0">
                      <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="break-words">{f.label}</span>
                    </span>
                    {f.size_label && (
                      <span className="font-sans text-tk-xs text-muted-foreground whitespace-nowrap">{f.size_label}</span>
                    )}
                  </a>
                )
              )}
            </div>

            {files.length > 0 && (
              <p className="font-sans text-tk-xs tracking-[0.1em] uppercase text-muted-foreground mt-10">
                Links work for 30 days, up to 15 downloads each. Save the files somewhere safe.
              </p>
            )}
          </>
        )}

        {state === 'pending' && (
          <>
            <Heading>Payment processing.</Heading>
            <Note>
              Your GCash or wallet payment hasn't settled yet. Keep this page open and the downloads will show up
              here once it clears, or wait for the email. You don't need to pay again.
            </Note>
            <Loader2 size={18} className="mx-auto mt-8 animate-spin text-muted-foreground" aria-hidden="true" />
          </>
        )}

        {state === 'slow' && (
          <>
            <Heading>Payment received.</Heading>
            <Note>
              Your download links are taking longer than usual. They'll arrive by email, so there's no need to pay
              again. If nothing shows up within an hour, reply to your Stripe receipt and I'll send them over.
            </Note>
          </>
        )}

        {state === 'unpaid' && (
          <>
            <Heading>Checkout not finished.</Heading>
            <Note>No payment went through for this checkout. You can go back to the shop and try again.</Note>
          </>
        )}

        {state === 'failed' && (
          <>
            <Heading>Payment didn't go through.</Heading>
            <Note>Your payment failed and you weren't charged. You can try again with another method.</Note>
          </>
        )}

        {state === 'refunded' && (
          <>
            <Heading>Order refunded.</Heading>
            <Note>This order was refunded, so its download links no longer work.</Note>
          </>
        )}

        {state === 'missing' && (
          <>
            <Heading>Thanks for stopping by.</Heading>
            <Note>This link has no order reference. If you just paid, your download links are in your email.</Note>
          </>
        )}

        <div className="mt-12">
          <Link to="/shop" className="font-sans text-tk-xs tracking-[0.2em] uppercase border-b border-foreground pb-1">
            Back to shop
          </Link>
        </div>
      </div>
    </div>
  );
}
