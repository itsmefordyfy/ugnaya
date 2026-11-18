# UGNAYA: Brand & Design System

Status (2026-11-06): **implemented for the website (Phases 1 to 3 of section 13), and re-based on the owner's official brand board (section 4); the mobile apps, the customer web wallet and the dashboards do not exist yet (see docs/UI_UX_AUDIT_AND_PLAN.md).** The owner's brief set the palette, the two typefaces and the
direction; everything marked *(my call)* was derived or decided while writing this and is open to change.
Built: tokens and the contrast test, Montserrat + Inter, Logo/icon/OG recolour, ButtonLink, TextField, Badge,
Card, Skeleton, the restructured home page, and `text-success`/links fixes across the site. **Not built yet
(no screen needs them): Toast and Dialog.** The logo is still my placeholder; `onGradient` (white text on the
brand gradient) was added to the tokens because `on-primary` flips to dark in dark mode.

Every contrast ratio below was measured (WCAG 2.x relative luminance), not estimated. Phase 1 turns
them into a test so they can't regress.

## 1. Brand identity and visual direction

**UGNAYA** (Filipino: *connection*). **Tagline: One Wallet. More Places. More Rewards.** (Filipino
line stays on the site: `TAGLINE_FIL` in `apps/marketing/src/lib/site.ts`.)

UGNAYA is a rewards ecosystem, not a punch card. One account, many independent businesses, points that
travel. The design has to say three things at a glance: *this is my balance*, *this is where I can use
it*, *this is what I get next*.

| Trait | What it looks like | What it never looks like |
|---|---|---|
| Modern, premium | Deep navy, generous space, large confident numbers | Neon gradients, glass everywhere, clip-art |
| Friendly, approachable | Rounded shapes, warm orange moments, plain words | Childish mascots, exclamation marks |
| Trustworthy | Calm surfaces, exact numbers, clear confirmations | Hype, countdown pressure, tiny fine print |
| Community | Merchants shown by name and place, the network visible | One brand's logo dominating another's |
| Simple | One primary action per screen | Dashboards of equal-weight cards |

**Visual direction:** a fintech wallet crossed with a friendly SaaS product. References are for craft
only (Stripe's clarity, Shopify's approachability, Revolut's wallet patterns, Apple's spacing, Linear's
consistency); no layout is copied.

**Principles**
1. **Numbers are the hero.** Points and amounts are the largest thing on any screen that has them.
2. **One accent per moment.** Navy for structure, purple for interaction, orange for reward moments,
   yellow for points. Never all at once.
3. **Cards are a choice, not a default.** Use whitespace, dividers and lists first; a card earns its
   border when it holds a distinct object (a wallet, a reward, a transaction).
4. **Calm by default, bright on reward.** The brightest colours appear when something good happens.
5. **Accessible is the baseline**, not a mode (section 12).

## 2. Colour

### 2.1 Brand palette (the owner's, fixed)

| Name | Hex | Role |
|---|---|---|
| Deep Navy | `#1E2A78` | Primary: brand, headings, navigation, primary buttons |
| Purple | `#7C3AED` | Secondary (token `accent`): interactive elements (links, focus, selection, toggles) |
| Orange | `#FF6B35` | Accent on the board (token `reward`): rewards, important actions, conversion calls to action |
| Yellow | `#FFC247` | Highlight on the board (token `points`): the points figure, badges |
| Teal | `#14B8A6` | Success: positive indicators |
| White | `#FFFFFF` | Main surfaces |
| Light Background | `#F8FAFC` | App and dashboard backgrounds |

### 2.2 What the brand colours can and cannot carry (measured)

| Colour | Text on white | White text on it | Dark ink (`#0F172A`) on it |
|---|---|---|---|
| Navy `#1E2A78` | **12.67** pass | **12.67** pass | 1.41 fail |
| Purple `#7C3AED` | 5.70 pass | **5.70** pass | 3.13 fail |
| Orange `#FF6B35` | 2.84 **fail** | 2.84 **fail** | **6.30** pass |
| Yellow `#FFC247` | 1.61 **fail** | 1.61 **fail** | **11.10** pass |
| Teal `#14B8A6` | 2.49 **fail** | 2.49 **fail** | **7.17** pass |

So, as rules:
- **Navy and purple carry white text. Orange, yellow and teal carry dark ink text**, always, as fills.
  White text on an orange button is a defect (2.84:1).
- **Orange, yellow and teal are never body text or thin icons on a light surface.** Use their
  *text-safe* shades (2.3) for text, or keep them as fills/shapes.
- Orange and yellow are fills and shapes (buttons, badges, progress, the points chip), not type.

### 2.3 Complete light theme (token → value)

| Token | Value | Notes |
|---|---|---|
| `surface` | `#F8FAFC` | App / page background |
| `card` | `#FFFFFF` | Cards, sheets, inputs |
| `ink` | `#0F172A` | Body text, 17.85 on white |
| `ink-2` | `#1E293B` | Secondary headings in dense UI, 14.63 |
| `ink-muted` | `#475569` | Supporting text, 7.58 |
| `ink-subtle` | `#64748B` | Captions, placeholders, 4.76 (never smaller than 12 px) |
| `ink-disabled` | `#94A3B8` | Disabled only (exempt from contrast) |
| `border` | `#E2E8F0` | Decorative card/section borders |
| `divider` | `#EEF2F6` | Hairlines inside lists and tables |
| `border-strong` | `#7B8AA0` | **Input and control outlines**, 3.51 (WCAG 1.4.11 needs 3:1) |
| `primary` | `#1E2A78` | + `on-primary` `#FFFFFF`; `primary-soft` `#F2F2F7` |
| `accent` | `#7C3AED` | + `on-accent` `#FFFFFF`; `accent-text` `#6D28D9` (7.10) for text on tints; `accent-soft` `#F5EFFE` |
| `reward` | `#FF6B35` | + `on-reward` `#0F172A`; `reward-text` `#B93E12` (5.58); `reward-soft` `#FFF0EB` |
| `points` | `#FFC247` | + `on-points` `#0F172A`; `points-text` `#7A4A00` (7.48); `points-soft` `#FFF2D7` |
| `success` | `#14B8A6` fill, + `on-success` `#0F172A`; `success-text` `#0F766E` (5.47); `success-soft` `#E3F6F4` (text on it 4.89) |
| `warning` | `#B45309` (5.02), `warning-soft` `#FFF2D7`, text on soft `#92400E` (6.39) | Deliberately not the brand yellow, which means *points* |
| `danger` | `#DC2626` (white on it 4.83), `danger-soft` `#FCEEEE`, text on soft `#B91C1C` (5.73) |
| `info` | `#0369A1` (5.93), `info-soft` `#EBF3F7` (5.28) | A third blue-ish hue is avoided: info is a teal-leaning blue, distinct from navy and purple |

### 2.4 Complete dark theme

**Light is the default** on every surface, regardless of the device's setting (owner's call, 2026-11-06). Dark is fully defined and tested but is opt-in: the website applies it only when `<html data-theme="dark">` is set (there is no toggle yet); the apps will expose it as a setting.

Navy-tinted near-black rather than pure black *(my call; CarMind's pure black is that app's own decision)*.
Cards step lighter, and **dark surfaces rely on borders, not shadows**.

| Token | Value | Measured on card `#151B2E` |
|---|---|---|
| `surface` / `card` / `raised` | `#0B1020` / `#151B2E` / `#1C2440` | |
| `ink` / `ink-muted` / `ink-subtle` | `#F1F5F9` / `#A3AEC2` / `#8591A8` | 15.61 / 7.65 / 5.38 |
| `border` / `border-strong` | `#2C3243` / `#6E727D` | decorative / 3.56 |
| `primary` | `#8B97F0` (`on-primary` `#0B1020`, 7.02) | 6.34. Navy itself vanishes on dark, so the primary lightens. |
| `accent` | `#A78BFA` | 6.28 |
| `reward` | fills stay `#FF6B35` with ink text (6.30); `reward-text` `#FF8A5C` | 7.36 |
| `points` | `#FFC247` | 10.63 |
| `success` / `warning` / `danger` / `info` | `#2DD4BF` / `#FBBF24` / `#F87171` / `#38BDF8` | 9.19 / 10.24 / 6.18 / 7.98 |
| Soft tints (14–16% of the hue on `card`) | primary `#282F4D`, accent `#2C2D4F`, success `#183542`, warning `#35322D`, danger `#352737`, info `#1A324A`, reward `#3A2D35`, points `#363232` | text on these is **not yet measured**: Phase 1's contrast test decides the final tints |

### 2.5 Gradients and background treatments (restrained)

| Name | Definition | Allowed on | Text |
|---|---|---|---|
| `brand` | 135°, `#1E2A78` → `#7C3AED` | The wallet card, the marketing hero band, onboarding | White (5.70 at the lightest end) |
| `reward` | 135°, `#FF6B35` → `#FFC247` | A "ready to redeem" ribbon, reward progress fill | Dark ink (6.30–11.10) |
| `wash` | radial, `accent` at 8% fading to `surface` over ~480 px from the top | Marketing hero, wallet home | n/a |

Rules: at most **one gradient surface per screen**; no gradient behind body text; no gradient on
buttons, inputs, tables or navigation.

## 3. Typography

| Family | Used for | Weights |
|---|---|---|
| **Montserrat** | The wordmark, hero, display, title and heading styles, the big wallet balance, marketing headlines | 600, 700, 800 |
| **Inter** | Everything else: body, forms, buttons, labels, tables, navigation, charts, changing numbers | 400, 500, 600, 700, 800 |

Montserrat is wide and loud, so it is **never used below 18 px** and never for data. Both are open-licence
(OFL). The shared playbook says "Inter on every surface"; Montserrat headings are a UGNAYA-specific
owner decision and stay in this repo only.

| Style | Family | Size / line | Weight | Use |
|---|---|---|---|---|
| `hero` | Montserrat | 56 / 60 (40 / 44 below 640 px) | 800 | Marketing hero only |
| `balance` | Montserrat | 48 / 52 | 800 | The wallet's static points total |
| `display` | Montserrat | 40 / 48 | 700 | Page titles on web, onboarding |
| `title` | Montserrat | 28 / 36 | 700 | Screen titles, section heads |
| `heading` | Montserrat | 22 / 28 | 600 | Card and sheet titles |
| `subheading` | Inter | 18 / 24 | 600 | Group titles, list headers |
| `body` | Inter | 16 / 24 | 400 | Default text (never below 16 on mobile inputs) |
| `label` | Inter | 14 / 20 | 500 | Buttons, field labels, table headers, chips |
| `caption` | Inter | 12 / 16 | 400 | Metadata, timestamps |
| `figure` | Inter | 32 / 40 | 800, tabular | Amounts, counters, anything that changes or sits in a column |

Rules: letter-spacing −0.02em on `hero`, −0.01em on `display`/`title`, 0 elsewhere; line length 60–75
characters for prose; **tabular digits on every number that changes or aligns** (`tabular-nums` on web,
`fontVariant: ['tabular-nums']` in React Native). The count-up animation uses `figure` (Inter) because
Montserrat's tabular figures are **not verified** on the web build or on device. Dynamic type: text
scales with the system up to 200% on web; in React Native cap at `maxFontSizeMultiplier` 1.4 on figures
and the tab bar, uncapped elsewhere.

## 4. Logo and symbol

**Source of truth: the owner's brand board** (`documents/UGNAYA Brand Identity Showcase.png`, gitignored). The
symbol is an interconnected ribbon that reads as an N and a U: a purple arch and stem, an orange arch, a blue
bowl and a yellow foot, passing over and under each other. It stands for connected businesses, one shared wallet
and continuous earning and redemption.

**How it was recreated.** The board is a raster, so the artwork was rebuilt as clean vector in `packages/brand`:
each of the four ribbon pieces is traced from the board's pixels, smoothed and fitted to a few cubic curves,
and filled with a gradient fitted to the board's own colours. The text is outlined (Montserrat ExtraBold wordmark
and Bold "TM", Inter Medium Italic tagline) so no file depends on installed fonts. **It is a faithful trace, not
a designer-drawn master:** at very large sizes some edges are slightly less regular than hand-drawn artwork. If a
designer supplies a master SVG, replace `packages/brand/src/geometry.ts` and run the build.

| Layout | Use |
|---|---|
| Symbol | Avatars, tight spaces, the empty state, the favicon tile |
| Horizontal | Headers, footers, documents (the default). The wordmark is centred vertically on the symbol (owner's call, 2026-11-07) |
| Horizontal with tagline | Hero, share image, print: "One Wallet. More Places. More Rewards." with the orange underline |
| Vertical | Square placements, splash, posters |

| Tone | Use |
|---|---|
| Full colour | Light backgrounds: colour symbol, wordmark in the logo navy `#0D1347` (sampled from the board, deeper than the UI's `#1E2A78`) |
| On dark | Dark backgrounds: colour symbol, white wordmark |
| White | Coloured or photo backgrounds, the brand gradient: one white colour |
| Single colour | One-colour printing: one navy colour |

**App icon.** The default is the navy tile (a gradient from `#3B3086` at the top left to `#0A103E`, as on the
board) with the full-colour symbol at about two thirds of the width. Also a light version (white tile) and a
monochrome version (white symbol on a violet-to-orange tile). Android gets adaptive layers (foreground,
background, and a single-colour layer for themed icons) with the symbol inside the 66% safe zone. The iOS icon is
an opaque 1024 px square (the system rounds it); the web favicon uses a larger symbol so it survives at 16 px.

**Navigation icons.** The board's direction: a white glyph on a rounded gradient tile, one tone per place (Home and
Account purple, My QR orange, Rewards yellow, Merchants and History blue, Vouchers purple, Offers pink, Wallet
teal, Notifications orange). Implemented as `TileIcon`; glyph contrast is tested (`tile-tones.test.ts`). The
brand's bright colours are for moments, so tiles are for navigation and feature highlights, not for walls of UI.

| Rule | Spec |
|---|---|
| Wordmark in the UI | Always the outlined artwork through `<Logo>`; never retyped in a font |
| Clear space | At least half the symbol's height on every side |
| Minimum size | Symbol 24 px in UI (16 px only inside the favicon tile); horizontal lockup 96 px wide |
| Never | Stretch or skew, rotate, add shadows or outlines, recolour the ribbon pieces, put a coloured symbol on a busy photo without a scrim, redraw the wordmark in another font, use the board image itself as a logo or icon |

**Files.** `packages/brand/assets/svg` (every layout and tone, the app icons, the favicon), `assets/png/ios`,
`png/android` (adaptive layers, mipmaps, Play Store), `png/web`, `png/expo` (`icon.png`, `adaptive-icon.png`,
`monochrome-icon.png`, `favicon.png`) and `png/logo` (2000 px transparent logos). Regenerate with
`npm run build --workspace @ugnaya/brand`; it also syncs the website's `icon.svg`, `favicon.ico`, `apple-icon.png`
and the downloadable kit at `/brand`. The tracing tools are in `packages/brand/tools` (they need the board image,
Pillow, fontTools and uharfbuzz).

## 4b. Ugi, the UGNAYA Assistant (mascot)

**Source of truth:** the owner's mascot board (`documents/UGI Mascot Board.png`, gitignored). Each pose on it is cut
out as its own transparent image by `packages/brand/tools/extract_mascot.py` (nothing is redrawn): `default` (waving),
`front`, `side`, `back`, `happy`, `wink`, `thinking`, `excited`, `helpful`, `celebrating`. Masters are PNG at twice the
board's size with smoothed, halo-free edges, plus WebP copies, in `packages/brand/assets/mascot`; the brand build copies
them into the marketing site and the app (not the admin portal). **Not available:** confused, sad, surprised,
welcoming, pointing, explaining and thumbs up are not on the board; they need new artwork from the illustrator, not
an imitation.

| Rule | Spec |
|---|---|
| One component | `<Ugi pose height alt? />` from `@ugnaya/web-ui`; never an `<img>` of a mascot file directly |
| Still, always | No animation (owner's call, 2026-11-07) |
| Where | Welcome and feedback moments: the marketing hero (from 640 px, beside the wallet, never over it on a phone), Meet Ugi, closing bands, sign-in panel (from 1024 px), check-your-email, reset-link-sent, sign-in errors, empty states, 404. Not on every screen, never in the admin portal |
| Size | 60 to 160 px in product screens, up to about 280 px on marketing and the sign-in panel |
| Meaning | Decorative by default (`alt=""`); give `alt` only where the picture says something the text doesn't |
| Never | Cover a button, a form field, a figure or navigation; flip, recolour or stretch him |

## 5. Tokens (shared by Next.js and React Native)

One source: `packages/ui-tokens` (TypeScript constants). Next.js receives them as CSS variables
(`toCssVariables()`, already built); React Native imports the same objects through a `theme` constant
and a `useTheme()` hook. **No hex values in components, ever.**

| Group | Values |
|---|---|
| Spacing (4 pt grid) | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64; web sections add 80, 96 |
| Radius | `sm` 8 (chips, tags) · `md` 12 (inputs, small cards) · `lg` 16 (cards) · `xl` 24 (sheets, the wallet card) · `pill` 999 (buttons, badges) |
| Shadow (light) | `sm` `0 1px 2px rgb(15 23 42 / .06)` · `md` `0 4px 12px -2px rgb(15 23 42 / .10)` · `lg` `0 16px 40px -12px rgb(30 42 120 / .28)` (navy-tinted, floating things only). React Native uses CSS `boxShadow`. Dark theme: none, borders instead |
| Focus ring | 2 px `accent` outline, 3 px offset (matches the site today) |
| Icon sizes | 16 inline with text · 20 in buttons and rows · 24 navigation · 32 feature/empty state · 48 illustration. Material Symbols Rounded, weight 400, filled variant for "selected" |
| Motion | 100 ms (press), 150 ms (hover/fade), 220 ms (sheets, expand), 360 ms (page/route); enter `cubic-bezier(.2,0,0,1)`, exit 70% of the enter time; press scale 0.98; points count-up 600 ms |
| Touch targets | ≥ 44 px everywhere; **staff/POS primary controls ≥ 56 px** |
| Breakpoints (web) | 360 · 640 · 768 · 1024 · 1280 · 1536; content max 1120 (marketing), 1280 (dashboards) |

## 6. Component guidelines

| Component | Variants and rules |
|---|---|
| **Button** | `primary` (navy, white text) · `reward` (orange, **ink text**) · `secondary` (white, `border-strong` outline, navy text) · `ghost` (text, accent) · `danger` (red, white). Pill. Heights 44 (md) / 52 (lg) / 64 (POS). Icon 20 px with 8 px gap. Loading replaces the label with a spinner and keeps width. **One primary action per screen.** `reward` is for reward moments (Redeem, Claim) and marketing conversion; everything else uses `primary` |
| **Inputs** | 48 px, radius `md`, `border-strong` outline, label above (never placeholder-only), helper text below, error replaces helper with an icon + message, focus ring `accent`. Variants: text, search, phone (+63 prefix), amount (peso prefix, `figure` type, numeric keypad), PIN/OTP (one box per digit) |
| **Cards** | `flat` (border, no shadow: default), `raised` (shadow `sm`, only for things that lift), `brand` (gradient, the wallet card only). Prefer a plain list with dividers over a stack of cards |
| **Navigation** | Mobile: bottom tabs, ≤ 5 items, icon + label, selected = filled icon + `primary` text. Web marketing: top bar, logo left, links, one `reward` CTA. Dashboards: left sidebar 240 px (collapses to icons below 1024), breadcrumb for depth, page title + one primary action on the right |
| **Modals / bottom sheets** | Mobile: sheet from the bottom, radius `xl`, grabber, max 90% height, swipe or X to close. Web ≥ 768: centred dialog (max 480; 640 for forms), focus-trapped, Esc closes, returns focus. Destructive confirms name the thing being deleted |
| **Badges / status** | Pill, `label` type, soft background + text-safe colour + an icon (never colour alone). Status: success, warning, danger, info, neutral. **Points badge**: `points` yellow fill with ink text. Merchant tier/"New" badges use `accent-soft` |
| **Tables** | Header `label` in `ink-muted`, 48 px rows (40 dense in admin), divider hairlines, sticky header, numbers right-aligned in `figure`-tabular, row hover `primary-soft`. Below 768 px a table becomes a stacked list (label/value pairs) |
| **Charts** | Series order navy, orange, teal, purple, yellow; always direct labels or a legend, and a second cue (marker/pattern/line style) so colour is never the only signal; light grid `divider`; tooltips on hover and focus; a "view as table" for screen readers. Apply the shared `dataviz` skill when building them |
| **Empty states** | The Linked-U motif at 48 px in `primary-soft`, a `heading`, one plain sentence saying what will appear and why, **one** action. Never a bare "No data" |
| **Loading** | Skeletons that match the final layout (1.2 s shimmer, static under reduced motion); a spinner only inside a button or a pull-to-refresh. Every data screen has loading, error, empty, content |
| **Toasts** | Mobile: bottom, above the tab bar; web: top right. 4 s (6 s with an action), error stays until dismissed. `aria-live` polite (success) / assertive (error). **A toast is never the only record of something important** (a POS result is a full-screen confirmation) |

## 7. Customer app: a premium membership wallet

Home answers "how many points, and what can I do with them":
1. **Wallet card** at the top (brand gradient, radius `xl`): UGNAYA network points in `balance` type, the points chip, and **Show my QR** as the primary action. Per-merchant balances sit below (a merchant's program points are its own, the network program is UGNAYA's).
2. **Ready to redeem**: rewards the person can claim right now, with the `reward` button. Rewards almost reached show progress ("45 of 60 points").
3. **Nearby and participating merchants**: a horizontal rail then a list; each shows name, distance, one offer.
4. **Recent activity**: transactions as a plain list (merchant, points ±, date), not cards.

Tabs: Wallet · Discover · Rewards · Activity · Profile. The QR sheet is the most-used screen: full-brightness white, the code at ≥ 70% of the width, the 6-digit code refresh shown as a quiet countdown ring. Offers are personalised but labelled ("Because you visit cafés"). Celebrate redemptions once (a short confetti-free scale + haptic), never repeatedly.

## 8. Merchant app: a professional business tool

Tabs: Overview · Customers · Rewards · Campaigns · More (branches, staff, settings). Overview leads with **three numbers** (points issued, points redeemed, returning customers) in `figure`, a 30-day line, then "needs attention" (a reward nearly out of stock, a flagged transaction). Rewards and campaigns use list rows with a status badge and an edit chevron. Calm, navy-forward, orange only on "Create reward" and live-campaign highlights. Branch and staff screens are plain lists with role badges.

## 9. Staff / POS app: speed over decoration

Built for a counter, one hand, a busy shift, a shared tablet.
- **Scan first**: the camera is the home screen after the PIN. Customer identified → name, points, any ready rewards.
- **Earn** is three steps: scan → type the amount (big amount keypad, `figure` type, 64 px keys) → confirm. **Redeem** is scan → pick reward → confirm.
- Controls ≥ 56 px; one primary button per screen; no tab bar; branch and cashier name always visible in the header.
- **Result screens are full-screen and unmistakable**: success = teal background, large check, "+25 points added to Maria"; error = red, a plain reason and the one thing to do next ("Code expired: ask Maria to refresh her QR"). Haptic on both; the result stays until tapped.
- High contrast only (no soft grey-on-grey); the lockout state (device locked 15 minutes) is calm and says when it unlocks.

## 10. Web: wallet, merchant dashboard, super admin

| Surface | Direction |
|---|---|
| **Customer web wallet** | The mobile wallet's single column, centred at 480 px on desktop with the brand wash behind it; the QR opens a large dialog; same tokens, no desktop-only features |
| **Merchant dashboard** | Sidebar + content (max 1280). Overview row of 3–4 figures, one chart per question, transactions table with filters and CSV export, customer list with last-visit and visit-count, rewards and campaigns editors with a live preview of the customer's card |
| **Super admin** | Same system, denser (40 px rows), a persistent **Platform admin** tag in the header, an environment banner if not production, every destructive or money action behind a typed confirmation, and an audit-log link on every merchant. Sections: Merchants (verify/suspend), Customers, Rewards, Subscriptions, Transactions, Platform settings, Network analytics |

## 11. Marketing website

Structure (the brief's): hero → customer benefits → merchant benefits → how it works → rewards ecosystem → platform features → pricing → FAQ → call to action.
- **Hero**: Montserrat `hero` headline = the tagline, one line of support, a `reward` CTA (ink text) and a secondary link, beside a real wallet mockup. `wash` behind it.
- **Vary the sections.** The home page currently stacks three similar icon-card grids; replace them with a split section (copy + phone), a numbered three-step flow on a plain background, a stat band, a network diagram for "rewards ecosystem", and a plain comparison table for pricing. Cards only for pricing plans.
- Alternate `surface` and `card` backgrounds sparingly; navy appears as one full-bleed band (final CTA), not everywhere.
- Both audiences are addressed with the same visual system: customer pages lean purple/orange, merchant pages navy.

## 12. Accessibility and responsive design

- **Contrast:** body text ≥ 4.5:1, large text and UI outlines ≥ 3:1 (the measured table in 2.2/2.3 is the reference). Inputs use `border-strong`, never `border`. Disabled is the only contrast exemption.
- **Colour is never the only signal:** status always carries an icon and a word; charts a second cue.
- **Focus:** visible 2 px accent ring on every interactive element, never removed; logical order; skip link (exists); dialogs trap and restore focus.
- **Touch:** ≥ 44 px (≥ 56 px POS); 8 px minimum between targets.
- **Motion:** respect reduced motion (opacity only, no count-up, static skeletons); nothing flashes more than 3×/second.
- **Text:** 16 px minimum body, scales to 200%; no text in images; Filipino text marked `lang="fil"`.
- **Screen readers:** icon-only buttons labelled, decorative icons hidden, errors announced next to the field, live regions for toasts, tables with headers and captions.
- **Responsive:** design at 360 first; wide layouts add columns, never just stretch. Tablets/foldables: wallet centred at 480, merchant/POS use two panes ≥ 768. Safe areas respected on every mobile screen. Verify at 360, 768, 1280 in light and dark.

## 13. Implementation plan (proposed; nothing below has been started)

Where things stand: `packages/ui-tokens` has the plan's blue/mango palette and an Inter-only type scale; the website is the only app built (46 component files). **Token names stay the same**, so changing the values restyles the whole site without editing every component. One place is not a pure value swap: `text-primary` is used 27 times for links, eyebrows and icons, and navy text is nearly the same as body ink, so **inline links move to `accent` purple** (with underline) while eyebrows and icons stay navy.

| Phase | Work | Check |
|---|---|---|
| **0. Decisions** | Owner supplies the master logo SVG and confirms the points in the next section | n/a |
| **1. Tokens** | `colors.ts` v2 (adds `accent`, `points`, `warning`, `info`, `*-soft`, `*-text`, `border-strong`, `raised`, gradients); `scale.ts` adds `family` per type style, `balance`, `hero`, `subheading`, shadows, motion, icon sizes; **a contrast test** asserting every pair in section 2 meets its floor; regenerate CSS variables | `npm test`, contrast test green |
| **2. Web foundation** | `next/font` Montserrat (variable) beside Inter; `globals.css` mapping; recolour `Logo` and `icon.svg`; add or extend `ButtonLink` (reward = ink text), `Badge`, `TextField` states, `Card` variants, `Skeleton`, `Toast`, `Dialog`; update `.claude/skills/ugnaya-platform-design` and `CLAUDE.md` (they currently say Inter and the old palette) | build, then screenshots at 360/768/1280, light and dark |
| **3. Marketing + auth** | Restructure the home page as in section 11; apply to the other marketing pages, sign-in, register, `/app` | same screenshots; keyboard and reduced-motion pass |
| **4. Mobile apps** | When the Expo apps start: generate `theme.ts` from the tokens; load Montserrat and Inter through the `expo-font` plugin; port components per the mobile playbook (Liquid Glass on iOS controls only, frosted on Android) | simulator/emulator checklist |
| **5. Dashboards** | Merchant dashboard, then super admin, on the same primitives; charts via the `dataviz` skill | per-screen checks |

Risks: the three hues (orange, yellow, teal) need the dark-ink rule enforced in code, not memory (hence the contrast test and a lint on `text-white` with `bg-reward`); Montserrat adds a second font download (kept to 3 weights, `display: swap`); dark-mode tints are unmeasured until Phase 1.

## 14. Decisions needed from the owner

1. **The master logo file** (SVG). The repo has only my placeholder.
2. **Orange buttons use dark ink text**, not white (white is 2.84:1). Confirm the look.
3. **Purple for links and interaction, navy for structure and the main button.** Confirm.
4. **"Reward" orange and "Points" yellow as two separate tokens** (the old single "reward" mango splits in two).
5. **Montserrat only for headings and the balance; Inter for all data and changing numbers.**
6. Approve Phase 1 and 2 to start.
