import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { friendlyError, isKnownCode } from './errors.ts';

const migration = (name: string) => readFileSync(fileURLToPath(new URL(`../../../../supabase/migrations/${name}`, import.meta.url)), 'utf8');
const codes = (sql: string) => new Set([...sql.matchAll(/raise_code\('([a-z_]+)'\)/g)].map((m) => m[1]));

/** The body of each admin_* function in a migration, so merchant-only codes in the same file don't count. */
const adminFunctionCodes = (sql: string) => {
  const found = new Set<string>();
  for (const m of sql.matchAll(/create or replace function (admin_\w+|require_reason)\([\s\S]*?\nend \$\$;/g)) for (const c of codes(m[0])) found.add(c);
  return found;
};

test('every error code an admin function can raise has a sentence', () => {
  const all = new Set([
    ...codes(migration('20261107000100_admin_rbac.sql')),
    ...codes(migration('20261107000300_admin_modules.sql')),
    ...adminFunctionCodes(migration('20261107000500_merchant_portal.sql')),
    ...adminFunctionCodes(migration('20261107000800_security_review_fixes.sql')),
  ]);
  assert.ok(all.size > 20, 'found the codes');
  const missing = [...all].filter((c) => !isKnownCode(c));
  assert.deepEqual(missing, []);
});

test('unknown messages get a generic sentence, never the raw text', () => {
  assert.equal(friendlyError('duplicate key value violates unique constraint "x"'), 'Something went wrong. Please try again.');
  assert.match(friendlyError('forbidden'), /permission/);
});
