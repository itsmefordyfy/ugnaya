# UGNAYA customer app (`@ugnaya/customer`)

The customer's wallet: one member code for every participating shop, points per shop (and network points later), rewards and
vouchers, shop discovery, notifications. Expo SDK 58, Expo Router, TypeScript strict, iOS first. Bundle id
`com.fordytechsolutions.ugnaya`, display name UGNAYA, deep link scheme `ugnaya://`.

Rules, decisions and the monorepo: the root `CLAUDE.md` and the owner's mobile playbook. Feature status, what was verified and
what's left: [`IOS_COMPLETION_TRACKER.md`](IOS_COMPLETION_TRACKER.md).

## Run

```bash
cp .env.example .env            # then fill both values (or copy them from apps/app/.env.local, see below)
npm run ios                     # from apps/customer: prebuild + build + launch on the iPhone 18 Pro simulator + Metro
npx expo start                  # Metro only, for an installed dev build
npm run check                   # lint, typecheck, unit tests (node --test)
```

`.env` holds only public values: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the same project as the
web app's `NEXT_PUBLIC_*`). Never a secret key. Copy them without printing them:

```bash
url=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' ../app/.env.local | cut -d= -f2-); key=$(grep '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' ../app/.env.local | cut -d= -f2-)
printf 'EXPO_PUBLIC_SUPABASE_URL=%s\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$url" "$key" > .env
```

Native config changes (app.json, plugins, fonts, icons) need `npx expo prebuild --platform ios --clean` before the next build.
`ios/` and `android/` are generated and ignored.

## Layout

```
src/app/            routes only (Expo Router): (tabs) Home, Wallet, My code, Discover, Account; auth and onboarding screens; stack screens
src/features/<x>/   one product area each; index.ts is its public API
src/api/            the backend contract: types of the customer functions' JSON, query keys, React Query hooks, session, profile
src/components/     shared UI (ui/ = primitives ported from the owner's other apps)
src/lib/            helpers: TOTP (member code), Supabase client, Keychain storage, errors, formatting, push, links
src/constants/      theme tokens (this app's own palette and type), strings, config
scripts/release-ios.mjs   archive + upload to App Store Connect (the owner runs it)
```

## Release (owner)

`npm run release:ios` from `apps/customer` archives with Xcode and uploads to App Store Connect (TestFlight); `-- --no-upload`
archives only. Before the first one: the App Store Connect app record for `com.fordytechsolutions.ugnaya`, the APNs key in
EAS/Apple, and `eas init` for the push project id (see the tracker's external dependencies).
