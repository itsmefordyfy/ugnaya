# UGNAYA marketing site (`apps/marketing`)

The public site at `ugnaya.com`: home, how it works, for customers and businesses, pricing, FAQ, about, contact, legal
pages, the `/brand` reference page and the customer waitlist. **It has no sign-in and no session.** Anything that needs
an account links to `app.ugnaya.com` (`lib/urls.ts` builds those links; `next.config.ts` redirects the old `/login`,
`/register`, `/app` and `/auth/*` URLs to the app, keeping the query string).

```bash
npm run marketing                      # from the repo root: http://localhost:3000
npm run build --workspace apps/marketing
npm test --workspace apps/marketing    # the pure helpers in src/lib
```

Environment: copy `.env.example` to `.env.local` (all values public). Domains come from `NEXT_PUBLIC_*_URL`
(one place: `packages/web-ui/src/lib/urls.ts`); never write a domain in a page. Deployment: `docs/DEPLOYMENT.md`.

## Structure

```
src/app/(marketing)/   the public pages (site nav + footer layout), each page's own components in _components/
src/app/               document shell, metadata files (sitemap, robots, share image, icons), not-found, error
src/components/        marketing/ (sections), site/ (nav, footer), ui/ (page-only primitives: Section, Prose, PhoneMockup)
src/lib/               site constants, plans, FAQ, waitlist parsing, markdown, urls; supabase/anon.ts (cookie-less)
src/content/           legal pages as Markdown strings
```

Shared components (Logo, ButtonLink, Badge, Card, Dialog, Toast, ...) and the base CSS come from
`@ugnaya/web-ui`. Server Components by default; `'use client'` only on an interactive leaf. Cache Components is on:
anything reading cookies, headers or `searchParams` sits inside `<Suspense>`. Tokens only (no raw hex); light is the
default, dark is opt-in with `data-theme="dark"`. Icons: `npm run icons --workspace @ugnaya/web-ui`.
