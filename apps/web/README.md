# UGNAYA website (`apps/web`)

The public site at `ugnaya.ph`, merchant sign-up, and (later) the web wallet and merchant dashboard.
Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Supabase (`@supabase/ssr`).

```bash
npm run web                       # from the repo root: http://localhost:3000
npm run build --workspace apps/web
npm test --workspace apps/web     # the pure helpers in src/lib
```

Environment: copy `.env.example` to `.env.local` (both values are public).

## Structure

Following the Next.js docs bundled with this version (`node_modules/next/dist/docs`, "Project
structure"): application code lives in `src/`, routes in `src/app` organised by route group, shared
code outside `app`, and page-only code next to its page.

```
src/
  app/
    layout.tsx              document shell only: <html>, Inter, metadata defaults, skip link
    globals.css             Tailwind + the design tokens (src/styles/tokens.css, generated)
    icon.svg, opengraph-image.tsx, sitemap.ts, robots.ts   metadata files
    not-found.tsx, error.tsx
    (marketing)/            public pages: site nav + footer (layout.tsx)
      page.tsx              /
      pricing/page.tsx      /pricing, …
    (auth)/                 sign-in and sign-up: a slim header, no footer
      register/
        page.tsx
        actions.ts          Server Actions for this page
        _components/        components only this page uses (private folder, never routed)
      login/, auth/confirm/route.ts, auth/callback/route.ts, …
    (account)/app/          signed-in merchant area (/app): its own header, requires a session
  components/
    ui/                     primitives: Icon, Logo, ButtonLink, Container, Section, PhoneMockup
    site/                   the site's chrome: SiteNav, SiteFooter
    marketing/              sections shared by several marketing pages
  lib/                      pure helpers with tests (*.test.ts), site constants, plan data
    supabase/               Supabase clients: server.ts (import 'server-only'), client.ts, proxy.ts
  content/                  long copy (legal pages) as Markdown
  styles/tokens.css         generated from @ugnaya/ui-tokens by predev/prebuild (gitignored)
  proxy.ts                  refreshes the Supabase session cookie on each request
```

## Conventions

- **Server Components by default.** `'use client'` only on the interactive leaf (the menu toggle, a
  form), never on a page or layout.
- **Cache Components is on.** Anything that reads cookies, headers or `searchParams` sits inside a
  `<Suspense>` boundary; static pages prerender into the shell.
- **Mutations are Server Actions** in the route's `actions.ts`. Each one validates its input and checks
  the session itself; the proxy only refreshes cookies, it doesn't authorise.
- **Server-only code** (`lib/supabase/server.ts`, anything reading secrets) starts with
  `import 'server-only'`. Only `NEXT_PUBLIC_*` values reach the browser.
- **Tokens only.** Colours, radii and spacing come from `@ugnaya/ui-tokens` through Tailwind classes
  (`bg-primary`, `text-ink-muted`, `rounded-pill`); no raw hex in components. Dark mode follows the system.
- **Icons** are Material Symbols Rounded, inline SVG (`<Icon name="…" />`). To add one, put its name in
  `scripts/build-icons.mjs` and run it (instructions at the top of that file).
- **Accessibility:** visible labels on every field, errors next to the field and announced, 44 px touch
  targets, a skip link, `aria-current` in navigation, decorative icons hidden from screen readers.
- **Metadata** through the Metadata API and file conventions, never hand-written `<head>` tags.
- File names are kebab-case; components are PascalCase named exports with a `<Name>Props` type; route
  files use the default export Next requires.


## Deploying on Vercel

1. New project from this repository; **Root Directory** `apps/web` (Vercel installs from the repo root
   because of the npm workspaces).
2. Environment variables (Production and Preview): `NEXT_PUBLIC_SUPABASE_URL`
   (`https://ohicvyappmccynchzukg.supabase.co`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project
   Settings → API keys), and `NEXT_PUBLIC_GOOGLE_SIGN_IN=true` once Google sign-in is set up.
3. Domain `ugnaya.ph` (and `www.ugnaya.ph` redirecting to it).
4. `prebuild` writes `src/styles/tokens.css` from `@ugnaya/ui-tokens`; nothing else to configure.

Before the first deploy, the Supabase project must be set up (`docs/SUPABASE_SETUP.md`): sign-up needs
the migrations, the auth settings (site URL `https://ugnaya.ph`) and the confirmation email template.
