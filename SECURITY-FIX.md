# Security fix — deploy order matters

## What was wrong

Two problems that compounded each other:

1. **The admin password was inlined in the public JS bundle.** Vite replaces
   `import.meta.env.VITE_*` at build time, so `VITE_ADMIN_PASSWORD` became a
   string literal anyone could read:
   `curl https://www.tabasjonbon.com/assets/index-*.js | grep admin_authed`

2. **The real hole: RLS policies.** `blog_posts`, `portfolio_projects` and
   `destinations` each had `for all using (true) with check (true)`, and
   `contact_inquiries` had a public `select`. The anon key is public by design —
   it ships in every Supabase browser app — so those policies meant **anyone
   could rewrite or delete all your content and read every contact inquiry**,
   password or not. The login form only hid the UI.

Anonymous uploads into the `media` storage bucket were open too.

## What changed

| Before | After |
|---|---|
| Password compared in the browser | Compared in `/api/admin`, server-side |
| `sessionStorage` flag as the gate | Signed httpOnly cookie, 12h expiry, `SameSite=Strict` |
| Editors wrote via anon key | Editors call `/api/admin`, which holds the service-role key |
| Anon could write every table | Anon can read published rows and insert a contact inquiry. Nothing else |
| Anon could upload to `media` | Uploads go through the authenticated endpoint |
| No brute-force protection | 8 attempts per IP per 15 minutes |

Session tokens are HMAC-SHA256 over the payload, so a stolen signature cannot be
replayed against a modified expiry.

## Deploy in this order

Doing it backwards locks you out of your own admin panel.

**1. Set environment variables in Vercel** (Settings → Environment Variables):

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | A new password. The old one is public — treat it as burned. |
| `ADMIN_SESSION_SECRET` | 40+ random chars. Rotating this logs everyone out. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |

Never prefix any of these with `VITE_`. That prefix is what put the old password
in the bundle.

**2. Delete the old `VITE_ADMIN_PASSWORD` variable.** Nothing reads it now.

**3. Deploy the code.** Admin writes now route through `/api/admin`.

**4. Log in at `/admin` and confirm you can edit a post.** If this fails, stop —
do not run the SQL yet, or you will have no way to edit anything.

**5. Run `supabase-security-fix.sql`** in the Supabase SQL editor.

**6. Verify.** Run the query at the bottom of that file and confirm only the
five expected read/insert policies survive. Then confirm the bundle is clean:

```
curl -s https://www.tabasjonbon.com/assets/index-*.js | grep -c admin_authed   # 0
```

## Rotate the Supabase keys too

The old anon key sat in a public bundle next to write-everything policies. It is
not a secret and never was — but rotate the **service_role** key if it has ever
been pasted anywhere outside Vercel: Supabase → Settings → API → Reset.
