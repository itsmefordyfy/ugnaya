# UGNAYA app (`apps/app`)

The customer product at `app.ugnaya.com`: sign-in, customer registration, forgot and reset password, email
confirmation, and the wallet. Businesses (owners, managers, cashiers) use the merchant portal, `apps/merchant`
(merchant.ugnaya.com), since 2026-11-07: `/register?type=merchant`, `/merchant` and `/pos` here redirect there. Private: never indexed, never framed
(`next.config.ts` headers, `robots.txt` disallows all).

```bash
npm run app                            # from the repo root: http://localhost:3001
npm run build --workspace apps/app
npm test --workspace apps/app
```

## Who goes where (`src/lib/auth/roles.ts`, pure and tested)

| Account | Home | Notes |
|---|---|---|
| Customer | `/wallet` | member ID today; points, QR, rewards, vouchers when built |
| Merchant owner or staff (manager, cashier) | `NEXT_PUBLIC_MERCHANT_URL` | the merchant portal has its own session, so they sign in there |
| Platform admin | `NEXT_PUBLIC_ADMIN_URL` | admins work in the admin portal, never in these areas |
| Signed in, nothing yet | `NEXT_PUBLIC_MERCHANT_URL/login?next=/register` | a business account that hasn't finished registering finishes in the portal |

The role is read from the database (each query limited to the person's own rows by row-level security), never from
anything the browser sends. The proxy redirects visitors to sign-in (remembering the page); each page checks again
with `requireArea(...)` (`lib/auth/guard.ts`), which is the check that actually authorises. Public paths: `/login`,
`/register`, `/forgot-password`, `/auth/*`, `/logout`, and `/merchant` and `/pos` (redirects to the merchant portal).

## Sessions

Supabase session cookies are set by this host only (no `Domain` attribute), so they are not shared with
`ugnaya.com` or `admin.ugnaya.com`. Links between the sites carry a destination and non-sensitive parameters only.

Environment: `.env.example`. Deployment: `docs/DEPLOYMENT.md`. Shared components: `@ugnaya/web-ui`.
