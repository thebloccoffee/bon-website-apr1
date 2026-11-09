# Security checklist

What protects the site today and what still needs doing before launch. Updated 2026-11-08 (Agent F).

## In place

### Headers (`vercel.json`, every path)

- `Content-Security-Policy-Report-Only`. It only reports for now, nothing is blocked. Violations show in the browser console. See "Turning on the CSP" below.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microphone, geolocation, payment and usb turned off
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`, so Stripe Payment Link pop-ups still work

The CSP allows:

| Directive | Allowed | Why |
|---|---|---|
| script-src | self, tracker.metricool.com | Vite bundle and Metricool after consent. No inline scripts are left in `index.html`. |
| style-src | self, 'unsafe-inline', fonts.googleapis.com | framer-motion and React `style` props write inline styles. Google Fonts CSS. |
| font-src | self, data:, fonts.gstatic.com | Google Fonts files |
| img-src / media-src | self, data:, blob:, https: | Supabase storage, YouTube thumbnails, Metricool pixel, uploads in admin |
| connect-src | self, *.supabase.co (https and wss), tracker.metricool.com | content API, auth, realtime |
| frame-src | youtube.com, www.youtube.com, www.youtube-nocookie.com, player.vimeo.com | video embeds |
| object-src | none | |
| base-uri, form-action | self | |
| frame-ancestors | self | |

`js.stripe.com` isn't listed because nothing in `src` loads Stripe.js. The shop uses Payment Links, which are plain links. Add it if Stripe Elements or Checkout.js ever ships.

### Forms and APIs

- `/api/contact`: per-IP rate limit, `website` honeypot, optional `t` minimum-time check, length limits, HTML escaping in both emails, and line breaks stripped from name and email so they can't inject mail headers. Returns 502 if Gmail fails.
- `/api/subscribe`: same rate limit, honeypot and timing check. Validates the email, requires `consent === true`, stores the exact consent wording and time, and inserts with the service role key. Bots get a fake "ok". Duplicate addresses get the same answer as new ones, so the form can't be used to check who is subscribed.
- `email_signups` has RLS on and no public policies. Admin reads it through `/api/admin-data` (list only).
- Signups CSV export prefixes cells that start with `= + - @` so they can't run as spreadsheet formulas.

### Privacy

- Metricool loads only after the visitor clicks Accept. Before that, no request goes to Metricool (checked in a preview build). The Privacy page has a link to change the choice.
- Metricool sets no cookies or local storage. Its `be.js` loads a pixel from `tracker.metricool.com` that carries the page URL, referrer and screen size.

## Known limits

- **The rate limiter counts per serverless instance.** Vercel can run several instances, so a determined sender can go over the limit. For a hard limit, move the counter to Upstash Redis or Vercel KV, or add a Vercel Firewall rate-limit rule on `/api/contact` and `/api/subscribe`.
- **The CSP sends no reports anywhere.** There's no `report-uri`, so violations only show in the console of whoever is browsing.
- `style-src 'unsafe-inline'` stays as long as framer-motion is used.

## Before launch

- [ ] Browse every page in production with DevTools open (including pages from the other Phase 2 agents) and fix any CSP violation the console shows.
- [ ] Then rename the header to `Content-Security-Policy` so it enforces.
- [ ] Decide on a hard rate limit (Upstash/KV or Vercel Firewall).
- [ ] `Contact.jsx` still inserts into `contact_inquiries` from the browser with the anon key. Move that insert into `/api/contact` and remove the anon insert policy on that table. Also send `t: <render time>` so the timing check is used.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_*` and admin secrets are set only in Vercel env vars, never as `VITE_*`.
- [ ] Fill every `<ToFill>` marker in `src/pages/legal/` (search the repo for `<ToFill`).
- [ ] Have Jon review the four legal pages. They're templates, not legal advice.
- [ ] Before the first newsletter goes out, wire an unsubscribe link that sets `unsubscribed_at`, and name the email tool in the Privacy Policy.
