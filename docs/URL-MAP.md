# URL map

Every live URL today and where it lives after the rebuild. Nothing moves, so no 301s are required. Agent D still adds the redirects listed at the bottom as hygiene.

| Current URL | After rebuild | Action |
|---|---|---|
| `/` | `/` | keep |
| `/journal` | `/journal` | keep |
| `/portfolio` | `/portfolio` | keep |
| `/contact` | `/contact` | keep |
| `/admin` | `/admin` | keep |
| `/journal/abel-and-ange-wedding` | same | keep |
| `/journal/alpine-meadows-bc` | same | keep |
| `/journal/bc-lions-vs-saskatchewan` | same | keep |
| `/journal/black-tusk-hike` | same | keep |
| `/journal/bruno-mars-concert-vancouver` | same | keep |
| `/journal/canada-day-vancouver-2026` | same | keep |
| `/journal/gastown-taiwan-fest` | same | keep |
| `/journal/gastown-vlog` | same | keep |
| `/journal/hiking-the-pump-peak-seymour-sunset` | same | keep |
| `/journal/how-to-enter-china-without-a-visa-my-xiamen-layover` | same | keep |
| `/journal/lavender-farm-bc` | same | keep |
| `/journal/mexico-festival-vancouver` | same | keep |
| `/journal/natural-bridge` | same | keep |
| `/journal/oakridge-mall-vancouver` | same | keep |
| `/journal/othello-tunnels-hope-bc-day-trip` | same | keep |
| `/journal/panorama-ridge-attempt` | same | keep |
| `/journal/proposal-angelo-x-lex` | same | keep |
| `/journal/skyheli-vancouver-helicopter-tour` | same | keep |
| `/journal/sunset-in-vancouver` | same | keep |
| `/journal/trip-to-bali-indonesia` | same | keep |
| `/journal/trip-to-korea` | same | keep |
| `/journal/trip-to-manila-japan-layover` | same | keep |
| `/journal/trip-to-saigon-vietnam` | same | keep |
| `/journal/trip-to-taiwan` | same | keep |
| `/journal/vancouver-fifa` | same | keep |
| `/journal/vancouver-lookout-sunset` | same | keep |
| `/journal/visiting-brittania-mine-museum` | same | keep |
| `/journal/vwa-unesco-biosphere` | same | keep |
| `/journal/wave-to-earth-concert-vancouver` | same | keep |
| `/journal/wild-whales-vancouver` | same | keep |

## New URLs (no old equivalent)

`/jooonbon`, `/bonpoints`, `/travel`, `/travel/:slug`, `/videos`, `/shop`, `/shop/:slug`, `/shop/thanks`, `/about`, `/search`, `/privacy`, `/terms`, `/refunds`, `/disclosures`, `/sitemap.xml`, `/robots.txt`

## Hygiene redirects (301)

| From | To |
|---|---|
| `tabasjonbon.com/*` | `www.tabasjonbon.com/*` (currently 307, make it 308/301 in Vercel domain settings) |
| `/blog`, `/blog/:slug` | `/journal`, `/journal/:slug` |
| `/works` | `/portfolio` |
| `/destinations` | `/travel` |
| `/store`, `/luts` | `/shop` |
| `/bon.points`, `/points` | `/bonpoints` |
| trailing-slash variants | no trailing slash |
