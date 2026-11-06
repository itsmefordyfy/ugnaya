# UGNAYA foundation, part 3: website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public UGNAYA website at `ugnaya.ph` with real merchant sign-up (email with confirmation, or Google), a customer waitlist, pricing, FAQ, legal drafts and a signed-in "Your application" page, ready to deploy on Vercel.

**Architecture:** One Next.js 16 App Router app in `apps/web` (`src/` layout, Turbopack, Tailwind CSS 4 themed from `@ugnaya/ui-tokens`). Marketing pages are static; sign-up, waitlist and the signed-in page use Server Actions and `@supabase/ssr` with the cookie session refreshed in `src/proxy.ts`. Nothing in the browser holds more than the Supabase URL and publishable key.

**Tech Stack:** Next.js 16.4, React 19, Tailwind CSS 4.3, `@supabase/ssr` 0.12, `@supabase/supabase-js` 2.119, Inter via `next/font/google`, Material Symbols Rounded (self-hosted subset or the Google Fonts icon font), Node's test runner for the pure helpers.

**Spec:** `docs/superpowers/specs/2026-11-06-ugnaya-foundation-design.md` (section "The website", calls 1 and 3, "Answered by the owner" 6)

## Global Constraints

- Domain `https://ugnaya.ph` in one constant (`SITE_URL`); env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only; `.env.local` gitignored, `.env.example` committed.
- Prices on the site come from `src/lib/plans.ts`: Free ₱0, Starter ₱399, Growth ₱899, Business ₱1,999, Enterprise "from about ₱5,000"; founding merchants 40% off for 12 months after a 90-day free pilot. The same numbers are in `plan_limits` (part 2); a test pins them.
- Tagline: "One Wallet. More Places. More Rewards." and, under it on Home, "Isang wallet. Mas maraming lugar. Mas maraming rewards."
- Copy names cafés, milk tea shops, restaurants and newly opened food businesses in Naga City; no "testimonials", no stock photos of foreign cafés (photo slots are labelled placeholders until the owner supplies real ones); legal pages carry "Draft, pending review by counsel" in their footer.
- Points are never described as money, cash or a peso value; the FAQ says points have no cash value and may expire with notice.
- Every page: `<title>`, description, Open Graph; accessible forms (labels, `aria-invalid`, error text tied by `aria-describedby`); touch targets ≥ 44 px; works at 360 px width with no horizontal scroll.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. An owner who confirmed their email, then closed the tab, must land on the business step when they return to `/register`, not on the account step: `registerStep()` test in Task 3, hand check in Task 9.
2. A signed-in owner who already registered must be sent from `/register` to `/app`, and a visitor with no session from `/app` to `/login` (Task 7 and 8 tests of the pure redirect rule; hand check Task 9).
3. A mobile number typed as `0917 123 4567` or `+63 917 123 4567` is accepted and stored as `+639171234567`; `0917123456` is refused with a message, not a crash (Task 3 test; the form shows the message).
4. Submitting the waitlist or register form twice (double tap, back button) must not create two merchants: `register_merchant` raises `already_registered`, and the action turns that into a redirect to `/app`, not an error (Task 7 test with a stubbed rpc).
5. A bad or expired confirmation link must show a page that says what to do (ask for a new link), never a stack trace (Task 6: `/auth/error` page and the route test).

---

### Task 1: Scaffold `apps/web` into the workspace

**Files:**
- Create: `apps/web/**` (from `create-next-app`), `apps/web/next.config.ts`, `apps/web/.env.example`, `apps/web/README.md`
- Modify: root `package.json` (no change needed if `web` script exists), `.gitignore` (confirm `.next/`, `next-env.d.ts`, `apps/web/src/styles/tokens.css`)

**Interfaces:**
- Produces: `apps/web/package.json` scripts `dev` (`next dev --turbopack`), `build` (`next build`), `start`, `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`node --test src/lib/`), `predev` and `prebuild` (`node ../../packages/ui-tokens/scripts/write-css.mjs src/styles/tokens.css`); dependencies `@ugnaya/ui-tokens`, `@ugnaya/rules`, `@ugnaya/db` as `"*"` workspace references, `@supabase/ssr`, `@supabase/supabase-js`.
- `next.config.ts`: `transpilePackages: ['@ugnaya/ui-tokens', '@ugnaya/rules', '@ugnaya/db']`, `turbopack: { root: path.resolve(import.meta.dirname, '../..') }` (the monorepo root; `fordytech-marketing` sets `root` the same way, and `__dirname` is not defined in an ESM config), `images: { remotePatterns: [] }`.
- `tsconfig.json` extends `../../tsconfig.base.json` with Next's overrides (`jsx: preserve`, `module: esnext`, `moduleResolution: bundler`, `allowJs`, `incremental`, `plugins: [{ name: 'next' }]`, `paths: { '@/*': ['./src/*'] }`, `include` as generated).

- [ ] **Step 1:** From the repo root: `npx create-next-app@16 apps/web --ts --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --disable-git --use-npm --skip-install --yes`; delete `apps/web/package-lock.json` if written; edit `package.json` scripts and dependencies as above; `npm install` at the root.
- [ ] **Step 2: Verify** `npm run web` serves `http://localhost:3000` (stop it), `npm run build --workspace apps/web` exits 0, `npm run lint && npm run typecheck` exit 0 at the root (the web workspace now included).
- [ ] **Step 3: Commit** `"apps/web: Next.js 16 scaffold in the workspace"`.

---

### Task 2: Theme, fonts, layout, nav, footer, logo

**Files:**
- Create: `apps/web/src/app/globals.css`, `src/styles/tokens.css` (generated, gitignored), `src/components/logo.tsx`, `src/components/site-nav.tsx`, `src/components/site-footer.tsx`, `src/components/container.tsx`, `src/components/section.tsx`, `src/components/button-link.tsx`, `src/components/phone-mockup.tsx`, `src/components/icon.tsx`, `src/lib/site.ts`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx` (placeholder until Task 4)

**Interfaces:**
- `src/lib/site.ts`: `export const SITE_URL = 'https://ugnaya.ph'`, `SITE_NAME = 'UGNAYA'`, `TAGLINE = 'One Wallet. More Places. More Rewards.'`, `TAGLINE_FIL = 'Isang wallet. Mas maraming lugar. Mas maraming rewards.'`, `CONTACT_EMAIL = 'hello@ugnaya.ph'` (to confirm with the owner; listed in `CLAUDE.md` open questions), `NAV: { label: string; href: string }[]` = How it works, For businesses, For customers, Pricing, FAQ; `CTA_MERCHANT = { label: 'Register your business', href: '/register' }`, `CTA_CUSTOMER = { label: 'Join the waitlist', href: '/for-customers#waitlist' }`.
- `globals.css`: `@import "tailwindcss"; @import "../styles/tokens.css";` then `@theme inline { --color-primary: var(--color-primary); --color-on-primary: …; --color-reward: …; --color-ink: …; --color-ink-muted: …; --color-surface: …; --color-card: …; --color-border: …; --color-success: …; --color-danger: …; --font-sans: var(--font-inter); --radius-sm: 8px; … }` so Tailwind classes `bg-primary`, `text-ink`, `rounded-lg` read the tokens; `body { background: var(--color-surface); color: var(--color-ink) }`; `.tabular { font-variant-numeric: tabular-nums }`.
- `layout.tsx`: Inter (`weight: ['400','500','600','700','800']`, `variable: '--font-inter'`), `metadataBase: new URL(SITE_URL)`, default title template `%s | UGNAYA`, description from the spec's Home line, Open Graph defaults, `lang="en"`, `<SiteNav />`, `{children}`, `<SiteFooter />`; theme colour `#2B4ACB`; `colorScheme: 'light dark'`.
- `Logo({ size?: number; wordmark?: boolean })`: inline SVG "Linked U": two interlocking rounded loops forming a U, left loop `--color-primary`, right loop `--color-reward`, viewBox `0 0 48 48`; wordmark "UGNAYA" in Inter 800 beside it when `wordmark`.
- `SiteNav`: fixed, frosted (`backdrop-blur`, translucent card), logo left, `NAV` links, the merchant CTA as a filled primary pill, a menu button under 768 px opening a full-width list; `aria-current="page"` on the active link (`usePathname`).
- `SiteFooter`: logo, one-line description, links (the pages plus Privacy, Terms, Merchant terms, Contact), "Fordytech Solutions · Naga City, Camarines Sur", the year.
- `Container` (max-width 1180, 16 px side padding at phone width), `Section({ id?, title?, eyebrow?, children })`, `ButtonLink({ href, variant: 'primary' | 'secondary' | 'ghost', size?: 'md' | 'lg' })` (pill, 44 px min height), `PhoneMockup({ title, lines: string[] })` (a rounded phone frame with a labelled placeholder screen: the title and bullet lines describing the screen; `aria-label` "Illustration placeholder: …"), `Icon({ name, size?, className? })` rendering a Material Symbols Rounded glyph via the `material-symbols-rounded` CSS class (load the font with `next/font/google` `Material_Symbols_Rounded` or a `<link>` in the layout; the builder picks what builds).

- [ ] **Step 1:** Write the files; `page.tsx` renders the logo, the tagline and both CTAs for now.
- [ ] **Step 2: Verify** `npm run build --workspace apps/web`, then `npm run web` and view `/` at 360 px and 1280 px (DevTools): nav collapses, no horizontal scroll, dark mode follows the system (toggle in DevTools). Take screenshots into `/private/tmp/...scratchpad/web/` for the report.
- [ ] **Step 3: Commit** `"Web theme from ui-tokens, Inter, layout, nav, footer, logo"`.

---

### Task 3: Pure helpers with tests

**Files:**
- Create: `apps/web/src/lib/plans.ts`, `src/lib/plans.test.ts`, `src/lib/faq.ts`, `src/lib/validation.ts`, `src/lib/validation.test.ts`, `src/lib/register-step.ts`, `src/lib/register-step.test.ts`

**Interfaces:**
- `plans.ts`: `type Plan = { code: 'free' | 'starter' | 'growth' | 'business' | 'enterprise'; name; priceCentavos: number | null; priceNote?: string; branches: number | null; staff: number | null; rewards: number | null; transactionsPerMonth: number | null; features: string[]; highlight?: boolean }`; `export const PLANS: Plan[]` (Growth highlighted) with the features from plan section 6's table (rows: directory listing, welcome and birthday rewards, network offers (phase 3), customer list and export, campaigns, analytics, API, support); `export const FOUNDING = { discountPercent: 40, months: 12, pilotDays: 90 }`; `export function formatPeso(centavos: number): string` → `₱399`, `₱1,999`, `₱0`.
- `validation.ts`: `isEmail(s): boolean` (simple RFC-ish regex); `normalizeMobile(s): string | null` re-exported from `@ugnaya/rules`; `export type RegisterInput = { tradeName; category; city; address; branchCount; ownerMobile; heardFrom; acceptTerms: boolean; marketingConsent: boolean }`; `parseRegisterForm(form: FormData): { ok: true; value: RegisterInput } | { ok: false; errors: Partial<Record<keyof RegisterInput, string>> }` (trade name 2 to 80 chars; category one of the six; city required; branches 1 to 50; mobile normalised; terms must be ticked); `parseWaitlistForm(form): { ok: true; value: { contact: string; kind: 'email' | 'mobile'; city?: string } } | { ok: false; error: string }`.
- `register-step.ts`: `export type RegisterStep = 'account' | 'check-email' | 'business' | 'done'`; `export function registerStep(input: { user: { id: string; emailConfirmed: boolean } | null; hasMerchant: boolean; justSignedUp: boolean }): RegisterStep` → no user and not just signed up → `account`; just signed up (email) → `check-email`; user and no merchant → `business`; user with merchant → `done`.
- `faq.ts`: `export const FAQ: { audience: 'merchant' | 'customer'; q: string; a: string }[]` with at least: Do my customers need an app? (no, web wallet or mobile number), What does it cost?, Do I have to give rewards to other shops' customers? (no; optional, capped, you choose), Do points expire? (yes, with notice; no cash value), Is my data safe? (Data Privacy Act, consent, deletion), When does the app launch?, Can I use it with my POS? (later), What is the Founding Merchant Program?

- [ ] **Step 1: Write the failing tests**
  - `plans.test.ts`: `PLANS.map(p => p.priceCentavos)` equals `[0, 39900, 89900, 199900, null]`; free limits `branches 1, staff 2, rewards 1, transactionsPerMonth 300`; `formatPeso(199900) === '₱1,999'`; exactly one plan is `highlight`.
  - `validation.test.ts`: `parseRegisterForm` with a valid form returns `ownerMobile '+639171234567'` from `'0917 123 4567'`; `'0917123456'` → `errors.ownerMobile` set; unticked terms → `errors.acceptTerms`; trade name `'A'` → error; category `'bar'` → error; `parseWaitlistForm` with `'juan@example.com'` → kind `email`; with `'09171234567'` → kind `mobile` and contact `'+639171234567'`; with `'hello'` → not ok.
  - `register-step.test.ts`: the four cases above.
- [ ] **Step 2: Run** `npm test --workspace apps/web` → FAIL. **Step 3: Implement.** **Step 4: Run** → pass; `npm run typecheck`.
- [ ] **Step 5: Commit** `"Web: plans, FAQ, form validation and register-step rules with tests"`.

---

### Task 4: Marketing pages

**Files:**
- Create: `apps/web/src/app/page.tsx`, `how-it-works/page.tsx`, `for-businesses/page.tsx`, `for-customers/page.tsx` (form added in Task 8), `pricing/page.tsx`, `faq/page.tsx`, `about/page.tsx`, `contact/page.tsx`, `src/components/pricing-table.tsx`, `src/components/faq-list.tsx`, `src/components/steps.tsx`, `src/components/feature-grid.tsx`, `src/components/cta-band.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`

**Interfaces:**
- Each page exports `metadata` (title, description). Content, from the spec's page table:
  - `/`: hero (tagline, Filipino line, one sentence: "A digital loyalty card for your café, milk tea shop or restaurant, and customers from the shops around you.", both CTAs, a `PhoneMockup` of the wallet); "Made for" strip (cafés, milk tea shops, restaurants, new food businesses); "How it works" three `Steps` (Scan, Earn, Redeem) with the counter time "under 10 seconds"; "For businesses" `FeatureGrid` (repeat customers, no cards or hardware, know your regulars, customers from nearby shops, campaigns); "For customers" grid (one QR, every shop, rewards you can actually reach, discover new places); pricing summary (four cards from `PLANS`, link to `/pricing`); Founding Merchant `CtaBand`.
  - `/how-it-works`: the customer flow (join from the standee or the app → show QR → cashier types the amount → points land → pick a reward → one-time QR) and the counter flow, each as `Steps` with a `PhoneMockup`; "No app needed" note (web wallet or mobile number).
  - `/for-businesses`: the merchant pitch from plan section 7 (repeat customers, no cards, nearby customers, measured results), the Founding Merchant Program table (benefits: 90-day free pilot, 40% off for 12 months, free setup, QR kit, priority support, founding badge), the New Shop Launch Pack (60 days of top directory placement, launch-week double points, a free first network offer once the network is live), "What we ask" (ask every customer for two weeks, display the kit, share a baseline, two reviews), CTA.
  - `/pricing`: `PricingTable` from `PLANS` (price per month, annual with two months free, limits, features; Growth highlighted; Enterprise "Talk to us"), founding note, FAQ links; a line: "Prices are for the pilot period and may change; founding merchants keep theirs for 12 months."
  - `/faq`: `FaqList` grouped by audience, each item a `<details>`.
  - `/about`: Fordytech Solutions, Naga City; why UGNAYA (two paragraphs from the plan's mission); contact email.
  - `/contact`: `CONTACT_EMAIL` as a `mailto:` link and a form (name, email, message) posting to `https://formsubmit.co/ajax/<CONTACT_EMAIL>` as `fordytech-marketing`'s `contact-section.tsx` does (no server key needed), with sent/error states.
- `sitemap.ts` lists every public page with `SITE_URL`; `robots.ts` allows all, disallows `/app`, `/auth`; `opengraph-image.tsx` renders the logo, tagline and `ugnaya.ph` with `ImageResponse` (1200×630).

- [ ] **Step 1:** Write the pages and components.
- [ ] **Step 2: Verify** `npm run build --workspace apps/web` (every page static except none), `npm run lint`, then view each page at 360 px and 1280 px; `curl -s localhost:3000/sitemap.xml | grep -c '<url>'` ≥ 10; `/opengraph-image` returns a PNG.
- [ ] **Step 3: Commit** `"Marketing pages: home, how it works, businesses, customers, pricing, FAQ, about, contact"`.

---

### Task 5: Legal drafts

**Files:**
- Create: `apps/web/src/app/privacy/page.tsx`, `terms/page.tsx`, `merchant-terms/page.tsx`, `src/components/legal-page.tsx`, `src/content/privacy.md`, `src/content/terms.md`, `src/content/merchant-terms.md`

**Interfaces:**
- `LegalPage({ title, updated: string, children })` renders prose with the footer line "Draft, pending review by counsel. Last updated 2026-11-06." Content as Markdown rendered at build time (a small Markdown-to-JSX step: `react-markdown` or a hand-written renderer for headings, paragraphs, lists; the builder picks).
- `privacy.md` (Data Privacy Act framing): what is collected (account, business details, mobile number, transactions, consents), why (run the loyalty program, verify the business, notify the founder), who sees it (the merchant you transact with sees your visits and points there; UGNAYA; Supabase in Singapore as processor), retention, rights (access, correction, deletion, complaint to the NPC), DPO contact (`CONTACT_EMAIL` until a DPO address exists), breach notice.
- `terms.md` (customers): points are a promotional reward with no cash value, cannot be bought, sold, transferred or cashed out; may expire with notice (12 months of inactivity for network points, each merchant's own period for its points); rewards subject to availability; one account per person; fraud and misuse; changes with notice; governing law Philippines.
- `merchant-terms.md`: the subscription (monthly, cancel any time, founding terms), the merchant funds its own rewards, network offers are optional and capped by the merchant, no money moves between merchants through UGNAYA, data sharing (controller/processor roles, the merchant's duties under the Data Privacy Act for its own customers), acceptable use, suspension, liability caps, termination and export of the merchant's customer list.

- [ ] **Step 1:** Write the three documents and the page shell. **Step 2: Verify** build and a visual check of one page. **Step 3: Commit** `"Legal drafts: privacy, customer terms, merchant terms (pending counsel)"`.

---

### Task 6: Supabase clients, session proxy, auth routes, login

**Files:**
- Create: `apps/web/src/lib/supabase/client.ts`, `server.ts`, `proxy.ts`, `apps/web/src/proxy.ts`, `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/error/page.tsx`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/logout/route.ts`, `src/lib/auth/redirects.ts`, `src/lib/auth/redirects.test.ts`, `src/components/auth-form.tsx`

**Interfaces:**
- `client.ts`: `createClient()` → `createBrowserClient<Database>(url, key)`.
- `server.ts`: `async createClient()` → `createServerClient<Database>(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: (list) => { try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } })` with `const cookieStore = await cookies()` (Next 16: `cookies()` is async).
- `proxy.ts` (lib): `updateSession(request: NextRequest): Promise<NextResponse>` following Supabase's pattern: build `supabaseResponse = NextResponse.next({ request })`, create the server client with `getAll`/`setAll` that writes to both the request and the response cookies, call `await supabase.auth.getClaims()`, and return `supabaseResponse`. `src/proxy.ts`: `export async function proxy(request) { return updateSession(request) }` with `config.matcher = ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']`.
- `redirects.ts` (pure): `export function gateFor(path: '/app' | '/register' | '/login', signedIn: boolean, hasMerchant: boolean): string | null` → `/app` and not signed in → `/login`; `/register` signed in with merchant → `/app`; `/login` signed in → `/app`; else null. Used by the three pages.
- `auth/confirm/route.ts`: reads `token_hash`, `type`, `next` (default `/register`); `supabase.auth.verifyOtp({ type, token_hash })`; success → redirect to `next`; failure → redirect `/auth/error?reason=confirm`.
- `auth/callback/route.ts`: reads `code` and `next`; `supabase.auth.exchangeCodeForSession(code)`; success → `next`; failure → `/auth/error?reason=oauth`.
- `auth/error/page.tsx`: plain explanation per `reason` and a link to `/login` ("Ask for a new link").
- `login/page.tsx` + `AuthForm({ mode: 'login' | 'signup', next })`: email + password fields, "Continue with Google" button (`signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback?next=${next}` } })` from the client), error text; `actions.ts`: `signIn(formData)` → `signInWithPassword` then redirect `/app`; `signOut` at `logout/route.ts` (POST) → `/`.
- Sign-up lives in `/register` (Task 7); `/login` is for returning owners.

- [ ] **Step 1: Write the failing test** `redirects.test.ts` for the `gateFor` cases above (six assertions).
- [ ] **Step 2:** Implement all files; `.env.example` with the two variables; `npm i @supabase/ssr @supabase/supabase-js --workspace apps/web` (already declared in Task 1; ensure installed).
- [ ] **Step 3: Run** `npm test --workspace apps/web` → pass; `npm run build` passes with the env vars set to placeholders (`NEXT_PUBLIC_SUPABASE_URL=https://ohicvyappmccynchzukg.supabase.co`, key from the dashboard into `.env.local`; a placeholder key still builds).
- [ ] **Step 4: Commit** `"Supabase SSR clients, session proxy, email confirm and OAuth callback, login"`.

---

### Task 7: Merchant registration

**Files:**
- Create: `apps/web/src/app/register/page.tsx`, `register/actions.ts`, `register/actions.test.ts`, `src/components/register-form.tsx`, `src/components/check-email.tsx`, `src/lib/merchant.ts`

**Interfaces:**
- `merchant.ts`: `async getOwnedMerchant(supabase): Promise<{ id: string; tradeName: string; status: string } | null>` (`merchant_staff` where `role = 'owner'` for the current user, joined to `merchants`; RLS scopes it).
- `register/page.tsx` (server component): reads the session (`getClaims` then `getUser` only when needed), `hasMerchant`, and `?step=check-email`; `gateFor('/register', …)` → redirect; else `registerStep(...)` picks what to render: `account` → `AuthForm mode="signup"` (email, password, full name; Google button); `check-email` → `CheckEmail({ email })`; `business` → `RegisterForm`; `done` → redirect `/app`.
- `actions.ts`:
  - `signUpWithEmail(prev, formData)`: validates email, password ≥ 8, full name 2 to 80; `supabase.auth.signUp({ email, password, options: { data: { user_type: 'merchant', full_name }, emailRedirectTo: `${SITE_URL}/register` } })`; on success redirect `/register?step=check-email&email=…`; on `user_already_exists`-type errors show "Already registered? Sign in."
  - `registerMerchant(prev, formData)`: `parseRegisterForm`; `supabase.rpc('register_merchant', { p_trade_name, p_category, p_city, p_address, p_branch_count, p_owner_mobile, p_heard_from, p_marketing_consent })`; success → redirect `/app?welcome=1`; error message `already_registered` → redirect `/app`; `sign_in_required` → redirect `/login?next=/register`; other → form error "Something went wrong, try again." Export the pure core `registerMerchantCore(rpc: (args) => Promise<{ error: { message } | null }>, input: RegisterInput): Promise<{ redirect: string } | { formError: string }>` so it can be tested without Supabase.
- `RegisterForm`: fields trade name, category (select, labels: Café / coffee shop, Milk tea or dessert shop, Restaurant or eatery, Bakery, Other food business, Other), city (default `Naga City`), address, number of branches (1), owner's mobile number, "How did you hear about UGNAYA?" (select: Visited by UGNAYA, Facebook, A friend or another shop, Other), two unticked checkboxes ("I agree to the Merchant Terms and Privacy Policy" with links; "Email me updates and tips, optional"), submit "Register my business"; pending state; errors inline from `parseRegisterForm`.
- `CheckEmail`: "We sent a confirmation link to {email}. Open it on this device to continue." and a "Resend" button calling `supabase.auth.resend({ type: 'signup', email })`.

- [ ] **Step 1: Write the failing test** `actions.test.ts`: `registerMerchantCore` with an rpc resolving `{ error: null }` → `{ redirect: '/app?welcome=1' }`; rpc error `already_registered` → `{ redirect: '/app' }`; `sign_in_required` → `{ redirect: '/login?next=/register' }`; other → `formError`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** tests, lint, typecheck, build → pass.
- [ ] **Step 5: Commit** `"Merchant registration: email or Google account, business details, register_merchant"`.

---

### Task 8: Waitlist and "Your application"

**Files:**
- Create: `apps/web/src/app/for-customers/actions.ts`, `src/components/waitlist-form.tsx`, `src/app/app/page.tsx`, `src/app/app/layout.tsx`
- Modify: `for-customers/page.tsx`

**Interfaces:**
- `joinWaitlist(prev, formData)`: `parseWaitlistForm`; `supabase.from('waitlist').insert({ contact, kind, city })` with the browser-session-less server client (anon key; RLS allows insert); duplicate contact is fine (no unique); returns `{ ok: true }` or the error message; the form shows "You're on the list. We'll text or email you when the app is out in Naga." and disables the button after success.
- `app/layout.tsx`: requires a session (`gateFor('/app', signedIn, hasMerchant)`), a slim header with the logo, the owner's name and a Sign out button (POST `/logout`).
- `app/page.tsx`: `getOwnedMerchant`; none → a card "Finish registering your business" linking `/register`; else the status card: `pending_verification` → "We're verifying {tradeName}. Expect a visit or a call within one business day." with the founder's email; `active` → "Verified. The business app and dashboard are coming next; we'll set you up in person." ; `suspended`/`closed` → a line to contact us; `?welcome=1` shows a one-time "Thanks for registering" banner.

- [ ] **Step 1:** Implement; add a `node --test` for nothing new (the pure parts are covered in Task 3).
- [ ] **Step 2: Verify** build, lint, typecheck; `/app` without a session redirects to `/login` (curl `-I` shows 307).
- [ ] **Step 3: Commit** `"Customer waitlist and the signed-in application status page"`.

---

### Task 9: Hand test against the hosted project, README, state

**Files:**
- Modify: `apps/web/README.md`, `CLAUDE.md` (Current state, Open questions), root `README.md`

**Precondition:** the owner has done `docs/SUPABASE_SETUP.md` steps 1 to 4 (login, link, `db:push`, `config push`) and put the publishable key in `apps/web/.env.local`. If not, do the local checks only and write "not verified against the hosted project" in the report and in `CLAUDE.md`.

- [ ] **Step 1: Hand test** (`npm run web`): sign up with a test email → "check your email" → open the link → business step → register → `/app` shows pending; sign out, sign in → `/app`; `/register` while signed in → `/app`; the waitlist form; Google sign-in only if the OAuth client is configured (otherwise record it as not tested). In the Supabase dashboard confirm the `merchants`, `merchant_branches`, `merchant_staff`, `subscriptions`, `loyalty_programs`, `audit_logs` rows for the test merchant, then delete the test user.
- [ ] **Step 2:** `apps/web/README.md`: run, env vars, Vercel settings (root directory `apps/web`, build command `npm run build`, install command `npm install` at the root, the two env vars, domain `ugnaya.ph`), what `predev`/`prebuild` generate. `CLAUDE.md` Current state: "2026-11-06: website pages, sign-up, waitlist, `/app` status; verified by hand against the hosted project: <list> / not verified: <list>." Open questions: confirm `hello@ugnaya.ph` and the contact form's target address; Resend domain verification; Google OAuth client.
- [ ] **Step 3: Verify** `npm run check` green at the root.
- [ ] **Step 4: Commit** `"Web README with Vercel settings; verified state in CLAUDE.md"`.
