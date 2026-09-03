import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';

// The overlay closes before the webhook necessarily lands, so poll briefly
// rather than showing an error the moment the order is not there yet.
const POLL_MS = 1500;
const MAX_POLLS = 20;

export default function PurchaseSuccess() {
  const [params] = useSearchParams();
  const identifier = params.get('order');
  const [order, setOrder] = useState(null);
  const [state, setState] = useState(identifier ? 'loading' : 'missing');

  useEffect(() => {
    if (!identifier) return;
    let tries = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/order?identifier=${encodeURIComponent(identifier)}`);
        if (res.ok) {
          setOrder(await res.json());
          setState('ready');
          return;
        }
        if (res.status === 410) {
          setState('refunded');
          return;
        }
      } catch {
        // network hiccup — fall through and retry
      }
      if (++tries >= MAX_POLLS) {
        setState('slow');
        return;
      }
      setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [identifier]);

  return (
    <div className="pt-40 pb-32 px-6 md:px-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl mx-auto text-center"
      >
        {state === 'loading' && (
          <>
            <Loader2 size={22} className="mx-auto animate-spin text-muted-foreground" />
            <p className="font-serif text-muted-foreground mt-6">
              Confirming your payment—this takes a few seconds.
            </p>
          </>
        )}

        {state === 'ready' && order && (
          <>
            <h1 className="font-sans text-3xl md:text-5xl font-light tracking-[-0.02em] leading-[1.1]">
              Thank you{order.name ? `, ${order.name.split(' ')[0]}` : ''}.
            </h1>
            <p className="font-serif text-muted-foreground mt-4">
              Order #{order.order_number}
              {order.product?.title ? ` · ${order.product.title}` : ''}. A copy of these links is on
              its way to your inbox.
            </p>

            <div className="mt-12 space-y-3">
              {order.files.length === 0 && (
                <p className="font-serif text-sm text-muted-foreground">
                  Your files are being prepared. Check your email in a minute, or reply to your
                  receipt and I will sort it out.
                </p>
              )}
              {order.files.map((f) => (
                <a
                  key={f.url}
                  href={f.url}
                  className="flex items-center justify-between gap-4 border border-border px-6 py-5 hover:bg-muted transition-colors duration-300 text-left"
                >
                  <span className="flex items-center gap-3 font-sans text-sm">
                    <Download size={16} className="shrink-0 text-muted-foreground" />
                    {f.label}
                  </span>
                  {f.size_label && (
                    <span className="font-sans text-xs text-muted-foreground whitespace-nowrap">
                      {f.size_label}
                    </span>
                  )}
                </a>
              ))}
            </div>

            <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-muted-foreground mt-10">
              Links valid 30 days · Save the files somewhere safe
            </p>
          </>
        )}

        {state === 'slow' && (
          <>
            <h1 className="font-sans text-2xl md:text-4xl font-light tracking-[-0.02em]">
              Payment received.
            </h1>
            <p className="font-serif text-muted-foreground mt-4">
              Your download links are taking longer than usual to generate. They will arrive by
              email shortly—no need to pay again. If nothing lands within an hour, get in touch and
              I will send them straight over.
            </p>
          </>
        )}

        {state === 'refunded' && (
          <p className="font-serif text-muted-foreground">This order has been refunded.</p>
        )}

        {state === 'missing' && (
          <p className="font-serif text-muted-foreground">
            No order reference found. If you have just paid, check your email for the download
            links.
          </p>
        )}

        <div className="mt-12">
          <Link
            to="/shop"
            className="font-sans text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1"
          >
            Back to shop
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
