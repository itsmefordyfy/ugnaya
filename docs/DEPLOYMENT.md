# Deployment: four separate web apps

| App | Folder | Domain | Dev port | Purpose |
|---|---|---|---|---|
| Marketing | `apps/marketing` | `https://ugnaya.com` | 3000 | Public site, SEO, waitlist. **No sign-in, no session, no cookies** |
| Product | `apps/app` | `https://app.ugnaya.com` | 3001 | Sign-in, registration, password reset, customer and merchant experiences. Private, never indexed |
| Admin | `apps/admin` | `https://admin.ugnaya.com` | 3002 | Super-admin portal (see `docs/ADMIN_PORTAL_ARCHITECTURE.md`) |
| Merchant | `apps/merchant` | `https://merchant.ugnaya.com` | 3003 | Merchant portal: registration, application, business management, web counter |

Run locally: `npm run marketing`, `npm run app`, `npm run admin`, `npm run merchant` (one terminal each).

## One Vercel project per app

For each app: New Project from this repository, **Root Directory** = the app's folder (Vercel installs from the repo
root because of the npm workspaces), framework Next.js. The shared packages (`web-ui`, `ui-tokens`, `brand`, `rules`,
`db`) are compiled by each app (`transpilePackages`).

### Environment variables (set for Production and for Preview/Staging)

| Variable | Marketing | App | Admin | Value |
|---|---|---|---|---|
| `NEXT_PUBLIC_MARKETING_URL` | yes | yes | yes | `https://ugnaya.com` (staging: its own origin) |
| `NEXT_PUBLIC_APP_URL` | yes | yes | yes | `https://app.ugnaya.com` |
| `NEXT_PUBLIC_MERCHANT_URL` | yes | yes | yes | `https://merchant.ugnaya.com` (the merchant app needs all four URLs too) |
| `NEXT_PUBLIC_ADMIN_URL` | yes | yes | yes | `https://admin.ugnaya.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | yes (waitlist) | yes | yes | `https://ohicvyappmccynchzukg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes (waitlist) | yes | yes | the project's publishable key |
| `NEXT_PUBLIC_GOOGLE_SIGN_IN` | no | optional | no | `true` once Google is configured |
| `ADMIN_ALLOWED_IPS` | no | no | optional | comma-separated IPs/CIDRs allowed to reach the admin portal |

`NEXT_PUBLIC_*` values are read at **build** time and baked in: change one, redeploy. Left blank they default to the
production domains above in a production build and to `localhost:3000/3001/3002` in development (one place:
`packages/web-ui/src/lib/urls.ts`). **No secret or service-role key belongs in any Next.js app.** The Supabase secret key
lives only in Supabase's Edge Function secrets.

### Staging

A second set of three Vercel projects (or Preview deployments) with the `NEXT_PUBLIC_*_URL` values pointing at the
staging origins, and a staging Supabase project if you want data isolation. Add the staging origins to Supabase's
redirect URLs too.

## Domains and DNS

At the registrar (or Vercel DNS): `ugnaya.com` and `www.ugnaya.com` to the marketing project (redirect `www` to the
apex), `app.ugnaya.com` to the app project, `merchant.ugnaya.com` to the merchant project, `admin.ugnaya.com` to the admin project. Vercel issues and renews the
TLS certificates for each domain automatically. Add the domain in each Vercel project, then create the DNS records
Vercel shows (an A record for the apex, CNAMEs for the subdomains).

`api.ugnaya.com`: there is no separate API server. The backend is Supabase (database, Auth, Edge Functions). A custom
API domain would be a Supabase custom domain (a paid add-on); until then the apps call the project URL directly.

## Supabase Auth settings (`supabase/config.toml`)

`site_url = https://app.ugnaya.com`, and the allowed redirects are the app and admin origins (production and
localhost). Marketing needs none (it has no sign-in). After changing the file: `npx supabase config diff`, then
`npx supabase config push`. Remember the free-plan limit on email templates (docs/SUPABASE_SETUP.md, step 5).

## Sessions across subdomains

Nothing is shared on purpose. Supabase sets its session cookies on the host that signs in (`app.ugnaya.com`, or
`admin.ugnaya.com`), without a `Domain` attribute, so each is invisible to the others and to `ugnaya.com`. A person
signed in to the app is not signed in to the admin portal, and the marketing site never sees a session. Links between
the sites carry only a destination and non-sensitive parameters (`type`, `next`, `utm_*`), never tokens.

## CORS

The apps call Supabase from the browser and from the server; Supabase allows the project's own clients. The Edge
Functions are called by the mobile apps and (later) the apps with a bearer token; if a browser app starts calling them
directly, add an allow-list of the three origins to the functions' responses at that point.

## After the first deploy

1. Sign in at `https://app.ugnaya.com/login`: redirected to `/` and then to the right home for the account type.
2. `https://ugnaya.com/login` redirects to the app and keeps the query string.
3. `https://ugnaya.com/sitemap.xml` lists only public pages; `https://app.ugnaya.com/robots.txt` disallows everything.
