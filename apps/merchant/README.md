# UGNAYA for Business (`apps/merchant`)

The merchant portal at `merchant.ugnaya.com` (dev: http://localhost:3003): registration and verification for
businesses, then the tools to run a loyalty program. Its own deployment, its own session, never indexed or framed.

```bash
npm run merchant                          # from the repo root: http://localhost:3003
npm run build --workspace apps/merchant
npm test --workspace apps/merchant        # pure rules in src/lib (node --test)
```

Environment: copy `.env.example` to `.env.local` (Supabase URL and **publishable** key only; never a secret or
service-role key). The other apps' origins default to localhost ports in development.

## Who sees what (`src/lib/auth/access.ts`, tested)

| Role | Sections | Starts at |
|---|---|---|
| Owner | everything; only the owner sends the application and edits the earning rule | `/dashboard` once approved, `/application` before |
| Manager (business-wide), Branch manager (a manager with branches) | everything but the two owner-only actions; staff changes limited to cashiers | same |
| Cashier with a sign-in | the counter | `/counter` |

Every page calls `requireStaff(section)` (`lib/auth/guard.ts`): signed in, on the active staff of a business, and a role
that may use the section. **That is convenience; the database decides**: row-level security and the SECURITY DEFINER
functions check `staff_role` inside Postgres for every read and write. Until UGNAYA approves the business, the counter
(and store QR), rewards, campaigns and staff invitations show as locked with an explanation (the database refuses them
too); the profile, branches, hours and documents stay editable.

## Pages

| Path | What | Database |
|---|---|---|
| `/register` | account (`user_type: 'merchant'`), then business details → a **draft** | `auth.signUp`, `register_merchant` |
| `/application` | status, journey, documents (upload/remove), send, the reviewer's message and reply, history | `merchant-documents` bucket, `merchant_add_document`, `merchant_remove_document`, `merchant_submit_application`, `merchant_respond_review`, `merchant_reviews` |
| `/dashboard` | KPIs, daily chart (SVG, with a table), branches, campaigns, top rewards, plan usage, announcements | `merchant_dashboard`, `platform_announcements` |
| `/counter`, `/counter/store-qr` | award and redeem (typing or camera via BarcodeDetector), the printable `M:<merchant_id>` QR | `counter_award`, `counter_redeem` |
| `/customers`, `/transactions`, `/activity` | members, transactions (type and branch filters), audit log; paged in SQL | `merchant_customers`, `merchant_transactions`, `audit_logs` |
| `/loyalty`, `/rewards`, `/campaigns` | earning rule with a live example, rewards, campaigns and promotions | `loyalty_programs`, `rewards`, `campaigns` (RLS) |
| `/profile`, `/branches` | business profile and logo, branches with operating hours | `merchants`, `merchant-logos` bucket, `merchant_branches` |
| `/staff`, `/invite/[token]` | team, invitations (link to copy; no email is sent), PIN-only cashiers | `merchant_invite_staff`, `merchant_revoke_invite`, `merchant_add_staff`, `merchant_update_staff`, `merchant_invite_preview`, `merchant_accept_invite` |
| `/billing` | plan, list and founding price, usage against limits; says plainly that online billing isn't active | `subscriptions`, `plan_limits` |

Files go from the browser straight to storage with the person's own session (`<merchant_id>/<random>-<name>` for
documents, `<merchant_id>/logo-<random>.<ext>` for logos); the storage policies read that first folder.

## Decisions (2026-11-07, the owner may overturn any)

- **One business per session.** Someone on the staff of two businesses works in the one where their role is strongest
  (`getMembership`); a switcher can come later.
- **Sessions are host-only** (no cookie `Domain`), separate from ugnaya.com, app.ugnaya.com and admin.ugnaya.com. The
  customer app sends business accounts here, where they sign in again.
- **Invitations survive sign-up in a cookie** (`ugnaya_pending_invite`, 7 days), not in the confirmation link: the
  email template appends its own query string to the redirect.
- **Operating hours**: `{ "mon": [{ "open": "08:00", "close": "20:00" }], …, "sun": [] }`, up to two ranges a day,
  close after open on the same day (`lib/hours.ts`); a null column means "not set".
- **No deletes** where the database grants none: rewards are turned off, campaigns cancelled, staff deactivated.
- **Counter idempotency**: one key per submission, made in the browser and kept until the cashier starts the next
  customer, so a double tap or retry answers with the first result.
- **Plan limits are shown, not enforced**, as recorded in CLAUDE.md; the founding price is the published 40% off.
- **Navy sidebar** from 1024 px, a top bar with a drawer below that; 48 px navigation targets, 56–64 px counter
  controls, two panes from 768 px for tablets.
