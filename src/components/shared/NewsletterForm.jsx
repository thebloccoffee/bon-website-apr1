import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const BRAND_LABEL = {
  jooonbon: 'jooonbon',
  bonpoints: 'bon.points',
};

/**
 * The exact sentence beside the checkbox. It is sent to /api/subscribe and
 * stored in email_signups.consent_text, so the CASL record matches what the
 * visitor saw. Change the wording here and new signups record the new text.
 */
function consentSentence(brand) {
  const label = BRAND_LABEL[brand] || BRAND_LABEL.jooonbon;
  return `Yes, email me the ${label} newsletter from Jon Bon Tabas. I can unsubscribe at any time.`;
}

/** Visible checkbox text, word for word (the trailing "Privacy Policy" is the link). */
export function consentText(brand) {
  return `${consentSentence(brand)} Privacy Policy`;
}

/**
 * Newsletter signup. Small enough for the footer and brand pages.
 * Consent box starts unticked (CASL express consent).
 */
export default function NewsletterForm({ source, brand = 'jooonbon', className = '' }) {
  const id = useId();
  const startedAt = useRef(Date.now());
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const label = BRAND_LABEL[brand] || BRAND_LABEL.jooonbon;
  const text = consentText(brand);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Tick the box so I know you want the emails.');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          brand,
          source: source || null,
          consent,
          consent_text: text,
          website,
          t: startedAt.current,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className={`max-w-sm ${className}`} role="status">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-foreground mb-2">You're on the list</p>
        <p className="font-serif text-sm text-muted-foreground leading-relaxed">
          Thanks for signing up to the {label} newsletter.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`w-full max-w-sm ${className}`} noValidate>
      <label htmlFor={`${id}-email`} className="block font-sans text-xs tracking-[0.3em] uppercase text-foreground mb-3">
        {label} newsletter
      </label>
      <div className="flex items-end gap-3">
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="you@example.com"
          className="flex-1 min-w-0 bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="shrink-0 font-sans text-xs tracking-[0.25em] uppercase border border-foreground px-5 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300 disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending' : 'Sign up'}
        </button>
      </div>

      <label htmlFor={`${id}-consent`} className="mt-4 flex items-start gap-3 cursor-pointer">
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(e) => { setConsent(e.target.checked); setError(''); }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
        />
        <span className="font-sans text-tk-lg text-muted-foreground leading-relaxed">
          {consentSentence(brand)}{' '}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>
        </span>
      </label>

      {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p className="mt-3 font-sans text-tk-lg text-destructive" role="alert">{error}</p>
      )}
    </form>
  );
}
