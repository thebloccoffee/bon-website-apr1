# Agent A handoff

Branch `phase-2/agent-a`, based on `hub` 4073984.

## Checks
- `npm run build` passes.
- `npx eslint` on touched files is clean (`--quiet`).
- At 390px and 1280px there's no horizontal scroll on /, /jooonbon, /bonpoints, /travel, /travel/xiamen, /journal, /about and /contact.

## What changed
- Nav: jooonbon, bon.points, Destinations (/travel), Journal and Shop, plus a search icon (/search) and the theme toggle. The mobile menu has the same links plus About and Contact.
- Footer: About, Contact, Videos, Portfolio, Privacy, Terms, Refunds and Disclosures, Instagram and YouTube for both brands, and `<NewsletterForm source="footer" />`. The background word is now "Jon Bon".
- Home: the hero stays, with the tagline "Travel films & travel on points". Below it are the BrandDoor tiles, latest videos, featured products, journal posts and the portfolio preview. A row hides when it has no data.
- /jooonbon and /bonpoints share `src/components/home/BrandPage.jsx`. /bonpoints is wrapped in `data-brand="bonpoints"` and uses `.bp-glass` cards and the bon.points wordmark. It shows both Disclosures under the intro and has the bonpoints newsletter form.
- /travel reads `getDestinations()`, and each card links to `/travel/:slug`.
- /travel/:slug has the destination header, its videos, and posts matched by location, city or tag. Each item shows a brand label, and an unknown slug shows "Destination not found".
- /about has a bio built from confirmed facts only, one block per brand, and links to Contact and Portfolio for collabs.
- PostCard was moved out of FeaturedPosts into `src/components/shared/PostCard.jsx`, which also exports `PostGrid`. It's used on Home, both brand pages and /travel/:slug.
- Journal has a Channel filter (All / jooonbon / bon.points) next to the destination filter, and each post shows a brand label.
- Contact has a new intro line covering collabs for both brands, and the inputs go full width on mobile. The form logic is unchanged.
- Images below the fold have width/height set and load lazily.
- `BrandDoor.jsx` also exports `BonpointsWordmark` for other agents to use.

## Posts query
I kept `src/components/home/postsQuery.js`. It asks for `brand` and `kind` first and, if that fails, retries with the older column sets. Posts with no brand count as jooonbon. Before the migration runs, this logs one expected 400 in the console.

Hub 88b711a changed `getPosts()` to `select('*')`, and that works before the migration. After merging hub, postsQuery.js can be swapped for `getPosts` (with the same brand fallback). I didn't make that switch here because this branch doesn't include 88b711a.

## Files touched
- Pages: Home, Jooonbon, Bonpoints, Destinations, TravelDestination, About, Contact, Journal
- `src/components/home/*`, with new files Section.jsx, Rows.jsx, BrandPage.jsx and postsQuery.js
- `src/components/layout/Navigation.jsx`, `SiteFooter.jsx`
- `src/components/shared/PostCard.jsx`, `BrandDoor.jsx`

## Jon to fill
- About: a longer bio, a portrait, and any press or collab details he wants public.
- Confirm the hero tagline and the Home section title "Pick a door".
- Check the brand intro lines. bon.points currently says "for Canadians, with a lot of Amex Membership Rewards".
- The Journal intro still uses the old travel-only copy.
- The Contact thank-you message still promises a reply "within 48 hours" (existing copy).

## Open issues
- VideoCard, ProductCard, NewsletterForm and Disclosure are still stubs, so those areas render empty until Agents B, E and F merge.
- The mobile menu still has no Escape-to-close and no focus trap.
