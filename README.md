# UGNAYA

One Wallet. More Places. More Rewards. A shared loyalty platform for independent cafés, milk tea
shops and restaurants in the Philippines, starting in Naga City.

## Layout

```
apps/web/            website and merchant sign-up (Next.js)
apps/customer/       customer app (Expo, coming next)
apps/business/       business app for owners and cashiers (Expo, coming next)
packages/            shared design tokens, points rules, database types
supabase/            database migrations, Edge Functions, tests
```

## Run it

```bash
npm install
npm run web      # http://localhost:3000
npm run check    # lint, typecheck and every test
```

Project notes for developers and Claude Code: [CLAUDE.md](CLAUDE.md). Supabase setup:
[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
