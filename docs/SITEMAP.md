# Sitemap (target)

One hub, three brand sections, one shop. Existing URLs are unchanged (see URL-MAP.md).

```
/                         Home hub: who Jon is, 3 brand doors, latest videos, featured product, newsletter
├── /jooonbon             Cinematic travel filmmaking: recreation reels, YT videos, LUTs, client work link
├── /bonpoints            Travel hacking + Canadian card rewards: guides, videos, MR cheat sheet signup,
│                         not-financial-advice note, affiliate disclosure
├── /travel               Destinations index (wires up the unrouted Destinations page)
│   └── /travel/:slug     One destination: its journal posts + videos
├── /journal              Blog / guides (existing). Filter by brand, destination, tag
│   └── /journal/:slug    Post (existing)
├── /videos               All videos, filter by brand + tag (YouTube facade embeds)
├── /shop                 All products
│   └── /shop/:slug       Product: images, description, CAD price, FAQ, buy button
│       └── /shop/thanks  Post-purchase thank-you
├── /portfolio            Works / client films (existing)
├── /about                Bio, both brands, press/collab info
├── /contact              Inquiry form (existing)
├── /search               Site search: posts, videos, products
├── /privacy              Privacy Policy (PIPEDA)
├── /terms                Terms of Use
├── /refunds              Refund Policy (digital goods)
├── /disclosures          Affiliate + not-financial-advice disclosures
└── /admin                CMS (existing; gains Videos, Products, Signups tabs)
```

Generated: `/sitemap.xml`, `/robots.txt`.

## Navigation

Header: jooonbon · bon.points · Travel · Journal · Shop · search icon · theme toggle
Footer: About · Contact · Videos · Portfolio · Privacy · Terms · Refunds · Disclosures · Instagram · YouTube (both channels) · newsletter form

## Content source per page

| Page | Tables |
|---|---|
| Home | videos (featured), products (featured), blog_posts (latest) |
| /jooonbon | videos/blog_posts/products where brand = 'jooonbon' |
| /bonpoints | videos/blog_posts/products where brand = 'bonpoints' |
| /travel, /travel/:slug | destinations, blog_posts by location/city, videos by tag |
| /journal | blog_posts |
| /videos | videos |
| /shop, /shop/:slug | products |
| /search | `search_site()` RPC |
| Legal pages | static in repo (versioned with git) |
