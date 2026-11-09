# Agent F handoff: legal, consent, forms, security

Branch `phase-2/agent-f`, rebased on `hub`. Build and lint pass. Checked in a local preview: the four legal pages render, the consent banner shows, and no Metricool request goes out until Accept.

## What's here

| File | What it does |
|---|---|
| `server-lib/rateLimit.js` | Per-IP limiter (counts per serverless instance), honeypot and minimum-time checks, `escapeHtml`, `isEmail`, `oneLine` |
| `api/subscribe.js` | Newsletter signup with CASL consent record. See `docs/SECURITY-CHECKLIST.md`. |
| `api/contact.js` | Hardened: rate limit, honeypot, optional `t` timing, escaping, length limits, header-injection guard, 502 on Gmail failure |
| `src/components/shared/NewsletterForm.jsx` | `<NewsletterForm brand="jooonbon"\|"bonpoints" source="..." />`. Consent box starts unticked, and the wording sent to the API is exactly what's shown. Also exports `consentText(brand)`. |
| `src/components/shared/Disclosure.jsx` | `<Disclosure kind="affiliate"\|"not-advice" />`, a one-line note linking to /disclosures |
| `src/components/legal/LegalPage.jsx` | Shared legal layout and the `<ToFill>` marker |
| `src/pages/legal/{Privacy,Terms,Refunds,Disclosures}.jsx` | PIPEDA/CASL-style drafts. Each starts with a "template, needs Jon's review" comment. |
| `src/components/CookieBanner.jsx` | Accept / No thanks. Loads Metricool only after Accept. Exports `loadMetricool()` and `resetCookieConsent()`. |
| `index.html` | Inline Metricool script removed |
| `src/components/admin/SignupsViewer.jsx` | Admin Signups tab: brand filter, hide/show unsubscribed, CSV export with consent wording |
| `vercel.json` | Security headers. The CSP is Report-Only. |
| `docs/SECURITY-CHECKLIST.md` | What's in place and the pre-launch list |

## Correction to AUDIT.md

AUDIT.md item 6 says Metricool "sets cookies". It doesn't. `be.js` is a 379-byte loader that requests a pixel from `tracker.metricool.com` with the page URL, referrer and screen size. The pixel response has no `Set-Cookie`, and nothing is written to local storage. The banner stays anyway: the pixel still sends visit data to a third party, so it waits for consent.

## Notes for other agents

- Any page with affiliate links or card content: add `<Disclosure kind="affiliate" />` or `kind="not-advice"` near the top.
- If you embed anything from a new origin (maps, Stripe.js, another video host), add it to the CSP in `vercel.json`, or it will show as a violation once the CSP enforces.
- The legal routes and the `email_signups` admin allowlist were already on `hub`. I didn't touch `App.jsx` or `api/admin-data.js`.
- `node_modules` in this worktree is a symlink to the main repo's.

## Outside my files, still open

- `src/pages/Contact.jsx` inserts into `contact_inquiries` from the browser with the anon key. It should only POST to `/api/contact` and include `t: <render time>`.
- Rate limiting isn't a hard limit until it moves to Upstash/KV or a Vercel Firewall rule.
- Unsubscribe flow (setting `unsubscribed_at`) doesn't exist yet. It's needed before the first newsletter.

## Jon to fill (search for `<ToFill`)

- Newsletter email tool name (Privacy)
- How long contact-form entries are kept (Privacy)
- Analytics retention settings for Metricool and Vercel (Privacy)
- Licence scope for shop files (Terms)
- Business name / registration, or remove the line (Terms)
- Refund window in days (Refunds)
- Partner list, or remove the line (Disclosures)
