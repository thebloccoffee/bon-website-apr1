# HANDOFF

## Phase 1: Audit and plan (2026-11-08, branch `phase-1/audit-plan`)

### Done
- `docs/AUDIT.md`: stack, routes, tables, env vars, findings, Phase 2 decisions D1–D3
- `docs/SITEMAP.md`: target structure, nav, data source per page
- `docs/URL-MAP.md`: all 35 live URLs. None move, so no breaking redirects
- `docs/DESIGN-SYSTEM.md`: existing tk-* tokens, `data-brand` scopes (bon.points v2), shared component list
- `supabase/migrations/20261108_hub_schema.sql`: brand/kind on blog_posts, `videos`, `products`, `email_signups`, full-text search + `search_site()` RPC, RLS on all. Tested on Postgres 16 (PGlite) together with the three existing SQL files: idempotent, search returns posts/videos/products, consent=false rejected

### Owner actions before Phase 2
1. **Now:** run `supabase-migration-rls-lockdown.sql` in Supabase SQL editor (contact inquiries are publicly readable today), run its verify query, fix `media` bucket storage policies
2. Run `supabase/migrations/20261108_hub_schema.sql`
3. Pick payment provider (AUDIT D3)
4. Turn on 2FA: GitHub, Vercel, Supabase, payment provider

### Phase 2 notes for agents
- No code changed in Phase 1. Production is untouched
- `.env.local` needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; server functions also need the vars in AUDIT.md (get them from Vercel → Settings → Environment Variables)
- Agent D owns AUDIT D1 (head injection + sitemap) and must also fix `/api/og` escaping (finding 3)
- Agent A wires `src/pages/Destinations.jsx` to `/travel` (a shared destinations topic, not a brand)
- Two brands only: `jooonbon` (Travel Filmmaker) and `bonpoints` (credit cards, finance, travel tips). Brand filters show exactly these two
- Newsletter writes go through a new `/api/subscribe`, never the anon key
