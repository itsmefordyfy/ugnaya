# UGNAYA foundation, part 1: monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `ugnaya` monorepo with the owner's Claude Code setup, npm workspaces, the three shared packages (`ui-tokens`, `rules`, `db`) and the root scripts, so parts 2 (backend) and 3 (website) have a home.

**Architecture:** Plain npm workspaces (`apps/*`, `packages/*`), no task runner. Packages ship TypeScript source (`main: src/index.ts`), consumed by Next.js through `transpilePackages` and by Expo through Metro later. Tests use Node's built-in runner (`node --test`), which runs `.ts` files directly on Node 22.23.

**Tech Stack:** Node 22.23, npm 12, TypeScript 5.x, `supabase` CLI 3.x as a root dev dependency (the Homebrew CLI is broken on this Mac), Claude Code plugins `expo` and `superpowers`.

**Spec:** `docs/superpowers/specs/2026-11-06-ugnaya-foundation-design.md`

## Global Constraints

- Repo root: `/Users/cliffordfrancisco/Projects/ugnaya`. npm only; never yarn, pnpm or bun.
- Package names: `@ugnaya/ui-tokens`, `@ugnaya/rules`, `@ugnaya/db`; app folders `apps/web`, later `apps/customer`, `apps/business`.
- TypeScript strict everywhere; no `any`; kebab-case file names; named exports.
- Colours and sizes from the spec, section "The website": primary `#2B4ACB` (dark `#6F86F0`), reward `#FFB020` (`#FFC14D`), success `#1F9D63` (`#3CC489`), danger `#D92D20` (`#F97066`), ink `#101828` (`#F2F4F7`), surface `#F7F8FA` (`#0B0F17`), card `#FFFFFF` (`#161B26`); 4 pt spacing grid.
- Earning maths (plan section 5): per-peso rule floors `amount / unit`; network rate is 1 point per ₱20 (`unitCentavos` 2000); the offer guideline is a reward worth 2% to 3% of the spend needed to earn it.
- `documents/` and every `.env*` file are gitignored. Nothing secret in the repo.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. Amounts with centavos (₱199.50 = 19950) must floor, never round up: `pointsForPurchase` on 19950 at 1 per ₱10 is 19. Test in Task 4.
2. A minimum spend equal to the amount earns; one centavo under does not. Test in Task 4.
3. A rule with `unitCentavos` 0 or negative points must throw, not divide by zero or issue negative points. Test in Task 4.
4. The offer guideline must accept ₱60 of value at 120 points (ratio 0.025) and reject both a free ₱150 pastry at 40 points (0.19, too generous) and ₱25 off at 120 points (0.0104, too stingy). Test in Task 4.
5. The CSS variables written from the tokens must contain every colour in both themes, so a token added later can't silently miss dark mode. Test in Task 3.

---

### Task 1: Repo skeleton, git, Claude Code setup

**Files:**
- Create: `package.json`, `.gitignore`, `.nvmrc`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.claude/settings.local.json`, `.claude/skills/ugnaya-platform-design/SKILL.md`, `.claude/skills/ui-ux-pro-max/**`, `docs/BUILD_AND_RELEASE.md`, `docs/superpowers/plans/.gitkeep`
- Existing: `docs/superpowers/specs/2026-11-06-ugnaya-foundation-design.md`, `documents/UGNAYA Business Plan (1).pdf` (owner's, gitignored)

**Interfaces:**
- Produces: root `package.json` with `workspaces: ["apps/*", "packages/*"]` and the scripts in the spec's table; later tasks add workspaces under it.

- [ ] **Step 1: Initialise git and the root package**

```bash
cd /Users/cliffordfrancisco/Projects/ugnaya && git init -b main
```

Write `package.json`:

```json
{
  "name": "ugnaya",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=22.18" },
  "scripts": {
    "web": "npm run dev --workspace apps/web",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm test --workspaces --if-present",
    "test:sql": "bash scripts/sql-tests/run.sh",
    "test:functions": "bash scripts/function-tests/run.sh",
    "check": "npm run lint && npm run typecheck && npm test && npm run test:sql && npm run test:functions",
    "db:push": "supabase db push",
    "db:types": "supabase gen types typescript --linked --schema public > packages/db/src/database.types.ts",
    "functions:deploy": "supabase functions deploy"
  }
}
```

`.nvmrc` holds `22`. Then `npm install -D supabase@^3 typescript@^5` at the root (pins the CLI; `npx supabase --version` must print `3.x`).

- [ ] **Step 2: `.gitignore`**

Bubblie's `.gitignore` (`/Users/cliffordfrancisco/Projects/bubblie/.gitignore`) plus these lines: `.next/`, `out/`, `.vercel`, `next-env.d.ts`, `.env*` (replacing `.env*.local`), `/documents/`, `supabase/.temp/`, `supabase/.branches/`, `.deno/`.

- [ ] **Step 3: Claude Code setup copied from Bubblie**

```bash
B=/Users/cliffordfrancisco/Projects/bubblie
mkdir -p .claude/skills && cp $B/.claude/settings.json .claude/settings.json
cp -R $B/.claude/skills/ui-ux-pro-max .claude/skills/ui-ux-pro-max
cp -R $B/.claude/skills/platform-design .claude/skills/ugnaya-platform-design
```

In `.claude/skills/ugnaya-platform-design/SKILL.md` replace the skill `name` with `ugnaya-platform-design` and every "Bubblie" with "UGNAYA" (`sed -i '' 's/Bubblie/UGNAYA/g; s/bubblie/ugnaya/g'`), then read it once and fix any sentence that no longer makes sense (a Bubblie-only screen name).

`.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)", "Bash(npm test*)", "Bash(npx tsc *)", "Bash(npx next *)",
      "Bash(npx supabase *)", "Bash(node --test *)", "Bash(deno *)", "Bash(git check-ignore *)",
      "Bash(xcrun simctl *)", "Bash(npx expo *)"
    ]
  }
}
```

- [ ] **Step 4: `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/BUILD_AND_RELEASE.md`**

`CLAUDE.md` from `~/.claude/skills/mobile-app-playbook/templates/CLAUDE.md`, adapted for the monorepo. Sections, in order: what UGNAYA is (two sentences from the spec's Intent, the first target market, a link to the business plan doc `https://claude.ai/artifact/8PZRKQXnF9XPUaNcoT1H55` and to `documents/UGNAYA Business Plan (1).pdf`); the playbook paragraph verbatim from the template; **Layout** (the tree from the spec's "The repo" section, one line each); **Stack in use** per app (web: Next.js 16, React 19, Tailwind 4, `@supabase/ssr`; backend: Supabase CLI 3, Postgres 17 hosted / 14 local, Deno Edge Functions; mobile: "not created yet, Expo SDK 58 when it is"); **Commands** (the root scripts table from the spec plus `npx supabase …` notes: the Homebrew CLI is broken, use the root dev dependency); **Current state** (dated 2026-11-06: "repo created, nothing built yet"; later tasks update it); **Owner decisions** (every bullet from the spec's "Owner decisions" and "Answered by the owner" sections, dated 2026-11-06, plus the seven calls from "Calls made after the builder check" marked "my call, owner may overturn"); **Open questions** ("Resend account and founder email address for sign-up notifications", "Google OAuth client", "when to commit and push: no remote yet"); **Gotchas** (no Docker so no `supabase start`; SQL tests run on Homebrew Postgres 14, migrations must stay 14-compatible; `documents/` is gitignored).

`AGENTS.md`: the template `~/.claude/skills/mobile-app-playbook/templates/AGENTS.md` verbatim, with one paragraph added at the top: "This is a monorepo: `apps/web` is Next.js, `apps/customer` and `apps/business` will be Expo apps; the Expo rules below apply inside those app folders."

`README.md`: name, one line on what UGNAYA is, the layout tree, how to run (`npm install`, `npm run web`, `npm run check`), links to `CLAUDE.md` and `docs/SUPABASE_SETUP.md` (written in part 2).

`docs/BUILD_AND_RELEASE.md`: a stub: "Written when the mobile apps are added (part 4). The web app deploys to Vercel with root directory `apps/web`; see `apps/web/README.md`."

- [ ] **Step 5: Verify**

Run: `npm install && npx supabase --version && git status --short | head`
Expected: install succeeds with no workspaces yet; `3.x.x`; the files above listed as untracked, `documents/` absent from the list.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Repo skeleton: workspaces, Claude Code setup, docs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Shared TypeScript config and lint for packages

**Files:**
- Create: `tsconfig.base.json`, `packages/tsconfig.package.json`, `eslint.config.js`
- Modify: `package.json` (devDependencies)

**Interfaces:**
- Produces: `tsconfig.base.json` (`strict`, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `allowImportingTsExtensions: true`, `noEmit: true`, `rewriteRelativeImportExtensions: true`, `verbatimModuleSyntax: true`, `skipLibCheck: true`) that every package and app `extends`.
- Produces: root `eslint.config.js` (flat config, `typescript-eslint` recommended, ignores `apps/**`, `supabase/**`, `node_modules`, `dist`) used by the packages' `lint` script.

- [ ] **Step 1: Write the configs**

`packages/tsconfig.package.json` extends `../tsconfig.base.json` with `"include": ["src/**/*.ts"]`. Install at root: `npm i -D eslint @eslint/js typescript-eslint`.

- [ ] **Step 2: Verify**

Run: `npx tsc -p packages/tsconfig.package.json --noEmit`
Expected: exits 0 (no files yet is fine: "error TS18003" means no inputs; if so, create `packages/.gitkeep` and accept until Task 3 adds files).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "Shared TypeScript and ESLint config for packages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: `@ugnaya/ui-tokens`

**Files:**
- Create: `packages/ui-tokens/package.json`, `packages/ui-tokens/tsconfig.json`, `packages/ui-tokens/src/index.ts`, `packages/ui-tokens/src/colors.ts`, `packages/ui-tokens/src/scale.ts`, `packages/ui-tokens/src/css.ts`, `packages/ui-tokens/src/css.test.ts`, `packages/ui-tokens/scripts/write-css.mjs`

**Interfaces:**
- Produces:
  - `export const colors: { light: ColorSet; dark: ColorSet }` where `ColorSet = { primary, onPrimary, reward, onReward, success, danger, ink, inkMuted, surface, card, border }` (hex strings). Values: primary `#2B4ACB` / `#6F86F0`, onPrimary `#FFFFFF` / `#0B0F17`, reward `#FFB020` / `#FFC14D`, onReward `#101828` both, success `#1F9D63` / `#3CC489`, danger `#D92D20` / `#F97066`, ink `#101828` / `#F2F4F7`, inkMuted `#475467` / `#98A2B3`, surface `#F7F8FA` / `#0B0F17`, card `#FFFFFF` / `#161B26`, border `#E4E7EC` / `#2A3140`.
  - `export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const` (pt/px).
  - `export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const`.
  - `export const typography`: `{ display: { size: 40, line: 48, weight: 700 }, title: { size: 28, line: 36, weight: 700 }, heading: { size: 22, line: 28, weight: 600 }, body: { size: 16, line: 24, weight: 400 }, label: { size: 14, line: 20, weight: 500 }, caption: { size: 12, line: 16, weight: 400 }, figure: { size: 32, line: 40, weight: 800, tabular: true } }`, font family `Inter`.
  - `export function toCssVariables(): string` returning a stylesheet: `:root { --color-primary: #2B4ACB; … --space-1: 4px; … --radius-sm: 8px; … }` plus `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --color-primary: #6F86F0; … } }` and `:root[data-theme="dark"] { … }` with the dark colours. Variable names: `--color-<camelCase→kebab-case>`, `--space-<key>`, `--radius-<key>`, `--font-<style>-size|line|weight`.
  - `scripts/write-css.mjs <outFile>`: writes `toCssVariables()` to the path (used by `apps/web` `predev`/`prebuild` in part 3).

- [ ] **Step 1: Write the failing test** `packages/ui-tokens/src/css.test.ts` (Node test runner)

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors } from './colors.ts';
import { toCssVariables } from './css.ts';

test('every colour appears in light, in the media dark block and in the data-theme dark block', () => {
  const css = toCssVariables();
  for (const key of Object.keys(colors.light)) {
    const name = `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    assert.equal(css.split(`${name}:`).length - 1, 3, `${name} should be set three times`);
  }
  assert.match(css, /--color-primary: #2B4ACB/);
  assert.match(css, /--color-primary: #6F86F0/);
  assert.match(css, /--space-4: 16px/);
  assert.match(css, /--radius-pill: 999px/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/ui-tokens && node --test src/` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `colors.ts`, `scale.ts`, `css.ts`, `index.ts`, `scripts/write-css.mjs`, `package.json` (`{ "name": "@ugnaya/ui-tokens", "version": "0.0.0", "private": true, "type": "module", "main": "src/index.ts", "types": "src/index.ts", "scripts": { "test": "node --test src/", "typecheck": "tsc -p tsconfig.json", "lint": "eslint src" } }`).

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npm test --workspace packages/ui-tokens && npm run typecheck --workspace packages/ui-tokens && npm run lint --workspace packages/ui-tokens`
Expected: 1 test passes; tsc and eslint exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "ui-tokens: colours, scale and CSS variables

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `@ugnaya/rules`

**Files:**
- Create: `packages/rules/package.json`, `packages/rules/tsconfig.json`, `packages/rules/src/index.ts`, `packages/rules/src/earning.ts`, `packages/rules/src/earning.test.ts`, `packages/rules/src/offers.ts`, `packages/rules/src/offers.test.ts`, `packages/rules/src/member-code.ts`, `packages/rules/src/member-code.test.ts`, `packages/rules/src/mobile.ts`, `packages/rules/src/mobile.test.ts`, `packages/rules/README.md`

**Interfaces:**
- Produces (all pure, no I/O):
  - `type EarningRule = { kind: 'per_peso'; pointsPerUnit: number; unitCentavos: number; minimumSpendCentavos: number } | { kind: 'per_visit'; points: number; minimumSpendCentavos: number } | { kind: 'stamps'; minimumSpendCentavos: number }`
  - `export const NETWORK_RULE: EarningRule = { kind: 'per_peso', pointsPerUnit: 1, unitCentavos: 2000, minimumSpendCentavos: 0 }`
  - `export function pointsForPurchase(rule: EarningRule, amountCentavos: number): number` — throws `RangeError` if `amountCentavos` is not a non-negative integer, or the rule has `unitCentavos <= 0`, `pointsPerUnit <= 0` or `points <= 0`. Below minimum spend: 0. `per_peso`: `Math.floor(amount / unitCentavos) * pointsPerUnit`. `per_visit`: `points`. `stamps`: 1.
  - `export const OFFER_GUIDELINE = { min: 0.02, max: 0.03 } as const`
  - `export function offerValueRatio(offer: { pointsCost: number; retailValueCentavos: number }, rule: EarningRule & { kind: 'per_peso' }): number` = `retailValueCentavos / (pointsCost / rule.pointsPerUnit * rule.unitCentavos)`.
  - `export function offerWithinGuideline(offer, rule = NETWORK_RULE): boolean`.
  - `export function formatMemberCode(memberId: string, code: string): string` → `U:<memberId>:<code>`; `export function parseMemberCode(scanned: string): { memberId: string; code: string } | null` (memberId 8 chars of `[A-HJ-NP-Z2-9]`; code 6 digits or `W` + 10 to 64 base64url chars); `export function formatRedemptionCode(token: string): string` → `R:<token>`; `parseRedemptionCode`.
  - `export function normalizePhMobile(input: string): string | null` → `+639XXXXXXXXX` for `09171234567`, `9171234567`, `+639171234567`, `63 917 123 4567`, with spaces, dashes and dots stripped; null otherwise.
- These mirror the SQL functions in part 2 (`points_for_amount`, `verify_member_code`), which use the same test vectors.

- [ ] **Step 1: Write the failing tests** (`node:test`, `assert/strict`)

`earning.test.ts`:
```ts
test('₱200 at 1 per ₱10 earns 20', () => assert.equal(pointsForPurchase(perPeso(1, 1000, 0), 20000), 20));
test('₱250 at the network rate earns 12, rounded down', () => assert.equal(pointsForPurchase(NETWORK_RULE, 25000), 12));
test('₱199.50 at 1 per ₱10 earns 19, never 20', () => assert.equal(pointsForPurchase(perPeso(1, 1000, 0), 19950), 19));
test('minimum spend: equal earns, one centavo under earns nothing', () => { assert.equal(pointsForPurchase(perPeso(1, 1000, 10000), 10000), 10); assert.equal(pointsForPurchase(perPeso(1, 1000, 10000), 9999), 0); });
test('per visit and stamps', () => { assert.equal(pointsForPurchase({ kind: 'per_visit', points: 5, minimumSpendCentavos: 0 }, 1), 5); assert.equal(pointsForPurchase({ kind: 'stamps', minimumSpendCentavos: 5000 }, 5000), 1); });
test('bad rules and amounts throw', () => { assert.throws(() => pointsForPurchase(perPeso(1, 0, 0), 100), RangeError); assert.throws(() => pointsForPurchase(perPeso(-1, 1000, 0), 100), RangeError); assert.throws(() => pointsForPurchase(NETWORK_RULE, 10.5), RangeError); assert.throws(() => pointsForPurchase(NETWORK_RULE, -1), RangeError); });
```
`offers.test.ts`: ratio of `{ pointsCost: 120, retailValueCentavos: 6000 }` at `NETWORK_RULE` is `0.025` and within guideline; `{ pointsCost: 40, retailValueCentavos: 15000 }` ratio `0.1875` is outside; `{ pointsCost: 120, retailValueCentavos: 2500 }` (≈0.0104) is outside.
`member-code.test.ts`: `formatMemberCode('AB2CD3EF', '287082')` is `U:AB2CD3EF:287082` and parses back; `U:ab2cd3ef:287082` (lowercase) is null; `U:AB2CD3EF:WabcDEF123_-x` parses with code starting `W`; `R:deadbeef` parses to token `deadbeef`; `hello` is null.
`mobile.test.ts`: the four accepted forms above → `+639171234567`; `0917123456` (10 digits) → null; `+6391712345678` → null; `12345` → null.

- [ ] **Step 2: Run to verify they fail**

Run: `cd packages/rules && node --test src/` → Expected: FAIL (modules not found).

- [ ] **Step 3: Implement** the four modules and `index.ts` re-exporting them; `package.json` as ui-tokens' with name `@ugnaya/rules`. `README.md`: one paragraph: these are the authoritative TypeScript mirrors of the SQL functions; the SQL is the authority at runtime and both share the test vectors listed here (copy the vectors as a table).

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npm test --workspace packages/rules && npm run typecheck --workspace packages/rules && npm run lint --workspace packages/rules`
Expected: all tests pass; exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "rules: earning maths, offer guideline, member and redemption codes, PH mobile numbers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `@ugnaya/db` placeholder and root check

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/src/index.ts`, `packages/db/src/database.types.ts`, `packages/db/README.md`
- Modify: `CLAUDE.md` (Current state)

**Interfaces:**
- Produces: `packages/db/src/database.types.ts`, a placeholder `export type Database = Record<string, never>;` until part 2 generates the real file (`npm run db:types`, or the local-Postgres variant in part 2's Task 10); `src/index.ts` re-exports `Database` and `export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']` guarded so it compiles against the placeholder (use a conditional type: `Database extends { public: { Tables: infer T } } ? … : never`).

- [ ] **Step 1: Write the package** (same `package.json` shape, `test` script `node --test src/ || true` is not allowed; use `"test": "node -e \"process.exit(0)\""` until types exist, and say so in the README).

- [ ] **Step 2: Verify the root scripts**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all three workspaces run; exit 0. (`test:sql` and `test:functions` fail until part 2; `check` is not run yet.)

- [ ] **Step 3: Update `CLAUDE.md` Current state**: "2026-11-06: monorepo, `ui-tokens`, `rules` (tested), `db` placeholder. No apps, no backend yet."

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "db package placeholder; root lint, typecheck and test run across workspaces

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
