# UGNAYA customer app: iOS completion tracker

Last updated 2026-11-07. App: `apps/customer` (`@ugnaya/customer`), Expo SDK 58, bundle id `com.fordytechsolutions.ugnaya`,
scheme `ugnaya://`. Backend contract: `supabase/migrations/20261107000600_customer_app.sql` and the Edge Function READMEs.

**How it was checked.** `npx expo lint` (clean), `npx tsc --noEmit` (clean), `npm test` (18 unit tests: TOTP against the
RFC 4226/6238 vectors and Node's crypto, scan-code parsing, error mapping, profile rules, opening hours), root
`npm run typecheck` (every workspace clean). Then `npx expo prebuild --platform ios --clean` and a Debug build on the
**iPhone 18 Pro simulator (iOS 26 SDK, Xcode 27.2)**, driven through Metro's debugger (no taps available) against the
**hosted** Supabase project with a real test customer. "Seen" below means looked at in a screenshot; "sample data" means
rows put into the in-memory React Query cache only for a layout check (nothing written to the backend).

Legend: ✅ done · 🟡 done, not fully verifiable yet · ⛔ blocked by something outside the app.

## Features

| Feature | UI | Backend integration | Error handling | Testing (simulator) | Remaining |
|---|---|---|---|---|---|
| Welcome slides (Ugi, 3 slides, Create account / I already have an account) | ✅ | none | n/a | Seen: cold start lands here signed out; slides 1 and 3 | Swipe gesture itself not tried (no taps); Android not run |
| Sign up (name, email, password with show/hide, terms consent) | ✅ | ✅ `auth.signUp` with `user_type: customer`, `full_name`; "check your email" path when no session comes back | ✅ validation shown on submit; auth codes mapped (email taken, weak password, rate limit, offline) | Seen: created `ios.test.customer.1107@ugnaya.com`; the trigger made the profile (member id `3GET7ZZ9`); validation error for the unticked terms seen | The "check your email" screen not seen (confirmation is off on the project) |
| Sign in | ✅ | ✅ `signInWithPassword` | ✅ wrong password → "That email and password don't match" | Seen: wrong then right password; session restored after relaunching the app (Keychain) | — |
| Forgot / reset password | ✅ | ✅ `resetPasswordForEmail` → `ugnaya://reset-password?code=…` → `exchangeCodeForSession` → `updateUser` | ✅ invalid email; an unusable link says why | Seen: validation; the invalid-link state | 🟡 No reset email was sent (the test inbox doesn't exist); the full email round trip is unverified. Needs `ugnaya://**` in the hosted project's redirect URLs (it is in `config.toml`; check it was pushed). PKCE runs as `plain` on Hermes (no WebCrypto) |
| Profile step (name, optional birthday month/day, city, marketing consent) → `onboarded_at` | ✅ | ✅ `customer_profiles` update (also stamps `terms_accepted_at`) | ✅ birthday rules (both parts, real day of month) | Seen: saved city, `onboarded_at`, `terms_accepted_at`; then the app opened | — |
| Not-a-customer / account unreadable / build not configured | ✅ full-screen gate with Sign out / Try again | reads `customer_profiles` | ✅ | Not seen (needs a merchant login) | — |
| Home: greeting, member card, bell with unread count, push and location asks, rewards, shops, promotions, announcements, recent activity | ✅ | ✅ `customer_home(p_lat,p_lng)`, unread count from `notifications` | ✅ skeleton, error with retry, pull to refresh, new-member card | Seen: real (empty) state; content state with sample data; dark mode | Real merchants/rewards/promotions/announcements: none exist on the hosted project yet |
| My code (member QR `U:<id>:<TOTP>`, 30 s countdown, digits, "show at the counter", earn celebration) | ✅ | ⛔ `qr-token device-secret` answers **404 NOT_FOUND (function not deployed)**; TOTP itself made on the phone | ✅ "being updated" message for an undeployed function, offline hint, retry | Seen: the error state from the real backend; with a test secret held in memory the QR rendered, and decoding the screenshot's QR gave `U:3GET7ZZ9:720560`, the same code Node's crypto computes | Deploy `qr-token`, then check a cashier scan end to end (the celebration polls `notifications` every 4 s while the code is on screen) |
| Scanner (shop store codes `M:<uuid>` open the shop; member/voucher/other codes explained) | ✅ | n/a | ✅ camera denied → Open Settings | Seen: the permission screen; parsing unit-tested | The camera view itself (the simulator has no camera); a real `M:` code |
| Wallet: totals, per-program cards (balance, available/held, expiry, rule), shortcuts | ✅ | ✅ `customer_wallet()` | ✅ skeleton, error, empty with "Show my code" | Seen: empty state, light and dark | Program cards with real accounts |
| Program detail (rule, lifetime, last visit, expiry, rewards here, history here) | ✅ | ✅ wallet + `customer_rewards(merchant)` + `customer_activity` filtered on the phone | ✅ | Not seen (no accounts) | `customer_activity` has no merchant filter: the app reads the last 200 and filters (backend change below) |
| Activity (All / Earned / Redeemed, paging) and transaction detail | ✅ | ✅ `customer_activity(kind, limit, offset)` | ✅ | Seen: empty state; rows with sample data on Home | Detail screen with real rows |
| Discover (search, category chips, A–Z / Nearby / Favorites, paging) | ✅ | ✅ `customer_merchants(...)` | ✅ empty states per filter, location ask for Nearby | Seen: empty state light and dark | Results with real merchants |
| Merchant profile (points + rule, rewards with eligibility, promotions, branches with hours and Apple Maps directions, contact, favorite) | ✅ | ✅ `customer_merchant`, `customer_favorites` insert/delete | ✅ `merchant_not_found` screen | Seen: not-found state from the real backend | Content with a real merchant; branch `hours` jsonb has no fixed shape yet, the app reads several plausible shapes (`lib/hours.ts`) |
| Rewards catalog (All / Ready) and reward detail (cost vs balance, Redeem with confirmation) | ✅ | ✅ `customer_rewards`; Redeem calls `qr-token redemption` | ✅ insufficient points, monthly cap, first visit only, unavailable | Seen: empty catalog | ⛔ redemption blocked by the undeployed `qr-token` |
| Voucher (QR `R:<token>`, 5-minute countdown, expired state, "used" celebration by polling `customer_redemptions`) | ✅ | ⛔ `qr-token redemption` | ✅ missing/expired code states | Seen: the "no longer here" state | Issue and scan a real voucher |
| My vouchers (issued/used/expired/cancelled; reopens a code issued on this phone) | ✅ | ✅ `customer_redemptions` | ✅ | Seen: empty state | The code can only be reopened while the app keeps it (server stores a hash) |
| Notifications list, mark read / mark all read | ✅ | ✅ `notifications` (channel `in_app`), `read_at` update | ✅ | Seen: empty state | Rows from a real award |
| Push: permission ask (explained first), Expo token → `register_push_token`, foreground banner, tap opens the transaction/shop | ✅ | 🟡 `register_push_token` wired; token removed on sign-out | ✅ | Not verifiable here: push needs a physical device, an EAS project id and APNs | See external dependencies |
| Account tab, Edit profile, Notification preferences (`notify_points/offers/expiry`), Change password (checks the current one), Privacy & data, Help & support (FAQ + mailto `hello@ugnaya.com`), Terms/Privacy links (in-app browser), Sign out | ✅ | ✅ | ✅ wrong current password shown inline | Seen: every screen light; Account and Privacy dark; birthday save (Nov 7) and the Offers toggle written and read back; sign-out back to the welcome | — |
| Delete account (two confirmations) | ✅ | ✅ `delete_my_account()` then local sign-out | ✅ `staff_account` explained | Seen: a second test account was created and deleted through the app; signing in with it afterwards fails | — |
| Design: tokens (Midnight Navy, Warm Ivory, Muted Teal, White, Border, Slate), Manrope + Inter bundled, light/dark, Liquid Glass on controls, haptics, 44 pt targets, safe areas | ✅ | — | — | Seen in light and dark on iOS 26 | Largest text size, VoiceOver pass, Android |
| Release readiness: icon and splash from `packages/brand`, usage strings (camera, location), `ugnaya` scheme, `eas.json` (development/preview/production), `npm run release:ios` | ✅ | — | — | Prebuild produced the plist strings, the scheme and the `aps-environment` entitlement | Archive/TestFlight not run (owner's step) |

## Backend changes needed (not made: `supabase/` is outside this app's brief)

1. **Deploy the `qr-token` Edge Function** (`npm run functions:deploy`). Without it there is no member code and no voucher.
2. **Push dispatch**: the backend function that sends `notifications` rows to `push_tokens` (the lead is adding it).
3. **Auth redirect URLs on the hosted project**: confirm `ugnaya://**` is applied (`config.toml` has it; `config push`).
4. Nice to have: `customer_activity(p_merchant_id)` (the program detail filters 200 rows on the phone today), and a fixed
   shape for `merchant_branches.hours` (the portal and the app should agree; the app reads several shapes).
5. Nice to have: a by-id read for one reward (`customer_rewards` is a list; the detail screen filters it).

## External dependencies (owner)

- **Apple Developer account**: the app record for `com.fordytechsolutions.ugnaya` in App Store Connect (team `M225MU29H3` is in `app.json`).
- **Push**: run `npx eas-cli@latest init` in `apps/customer` (writes `extra.eas.projectId`; the app reads it and skips push until then), create an APNs key and add it to the EAS project (`eas credentials`), then test on a real iPhone.
- **Sign in with Apple**: not built (no dead button). Needs the Sign in with Apple capability on the App ID, a Services ID + key configured as Supabase's Apple provider, and `expo-apple-authentication`. App Store rule 4.8 doesn't require it while the app offers only email sign-in (no third-party social login).
- **Support mailbox** `hello@ugnaya.com` and the public `https://ugnaya.com/terms` and `/privacy` pages (linked from sign-up and Account).

## Decisions made (owner may overturn)

- SDK 58 (the newest the owner's apps use, Bubblie; React 19.3.0 matches the web apps so the workspace shares one React).
- Components ported from Bubblie (SDK 58 versions of Pawfetti's); the app's own palette and type per the brief, not `packages/ui-tokens`.
- Tab names shown under the icons (Apple HIG), unlike Bubblie's icon-only bar.
- The member code is computed on the phone (works offline once the secret is stored); the secret lives in the Keychain (this device only) and is **deleted on sign-out**, since anyone holding it could make codes.
- The session is stored in the Keychain (chunked), not in plain app storage.
- Location is asked for only from Home's explained card or the Nearby sort, rounded to ~100 m, never stored.
- Notifications are asked for only from Home's explained card; preferences are saved on the profile so every phone honours them.
- Password reset happens in the app via the deep link (PKCE); the web reset page remains for links opened elsewhere.
- No offline cache of server data beyond React Query's memory (the backend is the source of truth for points).
- Test accounts on the hosted project: `ios.test.customer.1107@ugnaya.com` (kept for the lead's award/redeem tests) and `ios.test.delete.1107@ugnaya.com` (deleted through the app).

## Not done or not verified

- Android (not built or run).
- Real merchant data flows: wallet cards, merchant profile, rewards, vouchers, activity detail, notifications rows.
- Member code and vouchers end to end (blocked by `qr-token`), and a cashier scan.
- Push on a device; tapping a push.
- Largest Dynamic Type, VoiceOver, Reduce Motion; the iPhone Duo layouts.
- Swipe gestures and real taps (the simulator was driven through Metro's debugger).
