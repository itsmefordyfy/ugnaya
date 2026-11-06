// Two cashiers scan the same redemption QR at the same moment: exactly one may succeed.
// Run by scripts/sql-tests/run.sh with PGHOST, PGPORT, PGUSER and PGDATABASE set.
import assert from 'node:assert/strict';
import pg from 'pg';

const m1 = '50000000-0000-4000-8000-000000000001';
const b1 = '51000000-0000-4000-8000-000000000001';
const ana = '53000000-0000-4000-8000-000000000003';
const dev1 = '54000000-0000-4000-8000-000000000001';
const c1 = '57000000-0000-4000-8000-000000000001';
const upsize = '56000000-0000-4000-8000-000000000001';

const a = new pg.Client();
const b = new pg.Client();
await a.connect();
await b.connect();
const redeem = (client, key, token) =>
  client.query('select redeem_reward($1, $2, $3, $4, $5, $6) as r', [key, m1, b1, ana, dev1, token]);
const issue = async () =>
  (await a.query('select issue_redemption_token($1, $2) as t', [c1, upsize])).rows[0].t.token;
const balance = async () =>
  (await a.query('select balance from loyalty_accounts where customer_id = $1', [c1])).rows[0].balance;

try {
  await a.query('select award_points($1, $2, $3, $4, $5, $6, $7)', ['k1', m1, b1, ana, dev1, c1, 120000]);
  assert.equal(await balance(), 120);

  // 1. Deterministic: A holds its transaction open; B's scan must wait for it, then be refused.
  const t1 = await issue();
  await a.query('begin');
  await redeem(a, 'ca', t1);
  let bSettled = false;
  const bScan = redeem(b, 'cb', t1).then(
    (value) => { bSettled = true; return { ok: true, value }; },
    (error) => { bSettled = true; return { ok: false, error }; },
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(bSettled, false, 'the second scan waits for the first');
  await a.query('commit');
  const second = await bScan;
  assert.equal(second.ok, false, 'the second scan is refused');
  assert.equal(second.error.message, 'token_used');
  assert.equal(await balance(), 80, 'points taken once');

  // 2. Both at once, no help from the test.
  const t2 = await issue();
  const results = await Promise.allSettled([redeem(a, 'cc', t2), redeem(b, 'cd', t2)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1, 'exactly one succeeds');
  assert.equal(results.find((r) => r.status === 'rejected').reason.message, 'token_used');
  assert.equal(await balance(), 40, 'points taken once');

  const drift = await a.query('select count(*)::int as n from check_ledger()');
  assert.equal(drift.rows[0].n, 0, 'ledger and balances agree');
} finally {
  await a.end();
  await b.end();
}
