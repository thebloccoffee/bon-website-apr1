# Agent C handoff: Search

Branch `phase-2/agent-c`, based on `hub` (4073984).

## What I built

- `/search?q=...&brand=...` (`src/pages/Search.jsx`). The input is synced to the URL: typing updates `q` after 250 ms using `replace`, so history stays clean. Back/forward and outside links write the URL, and the input follows it. Brand chips (All / jooonbon / bon.points) set `brand`. Results are grouped by kind (Posts, Videos, Products) with type chips that show counts. Links go to `/journal/:slug`, `/videos?v=slug` and `/shop/:slug`. There are states for empty, searching, no results and error.
- Fallback: the page calls `supabase.rpc('search_site')` directly. If that errors (today it returns PGRST202 because the function is missing), it loads the published posts once and matches each word case-insensitively against title, excerpt, location, city and tags. All words must match, and title hits rank highest. The fallback is isolated in a marked block in Search.jsx, so you can delete it after the migration.
- `src/components/shared/SearchBox.jsx`: a compact `role="search"` form with a visually hidden label. It is uncontrolled by default and navigates to `/search?q=` on submit. It becomes controlled when you pass `value` + `onValueChange`, and `onSubmit` overrides the navigate. With `autoFocus` it focuses on mount. `slashToFocus` makes "/" focus the box unless the user is already typing in a field. Esc clears it.
- `src/hooks/use-debounce.js`: `useDebounce(value, delay)`.
- Results are announced through a `role="status" aria-live="polite"` line. Filter chips use `aria-pressed`.

## Verified against live data (anon key)

| Query | Result |
|---|---|
| vancouver | 3 posts |
| xiamen | 1 |
| hike | 1 |
| british columbia | 3 |
| british columbia + brand=bonpoints | none (expected) |
| zzzqq | "No results" |

The page autofocuses on load, and "/" focuses the box. There is no horizontal overflow at 390 px. I also checked it at 1280 px.

## Issues outside my files (not changed)

1. `getPosts()` in `src/api/content.js` returns `[]` on prod today. It selects `brand,kind`, and those columns don't exist until the hub migration runs (error 42703). Any page that uses it will show no posts until the migration is applied. That's why my fallback queries legacy columns directly instead of calling `getPosts()`.
2. Prod has 6 published posts, not 30.
3. Agent A: link the header search icon to `/search`, or drop `<SearchBox />` (uncontrolled) into the header or mobile menu.

## Follow-ups

- After `20261108_2_hub_schema.sql` is live, delete the fallback block in Search.jsx.
- An optional tag filter isn't built.

## Jon to fill

None. The page copy is limited to labels and short status lines.
