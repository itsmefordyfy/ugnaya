// The same owner submits the registration twice at once (two tabs, a double POST): one business only.
// Run by scripts/sql-tests/run.sh with PGHOST, PGPORT, PGUSER and PGDATABASE set.
import assert from 'node:assert/strict';
import pg from 'pg';

const owner = '1a000000-0000-4000-8000-000000000001';
const a = new pg.Client();
const b = new pg.Client();
await a.connect();
await b.connect();
const asOwner = async (client) => {
  await client.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: owner, role: 'authenticated' })]);
  await client.query('set role authenticated');
};
const register = (client) =>
  client.query(`select register_merchant('Kape Dos', 'cafe', 'Naga City', null, 1, '+639171234567', null, false) as id`);

try {
  await a.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'dos@example.com', '{"user_type":"merchant"}')`, [owner]);
  await asOwner(a);
  await asOwner(b);

  await a.query('begin');
  await register(a);
  let bSettled = false;
  const second = register(b).then(
    () => { bSettled = true; return { ok: true }; },
    (error) => { bSettled = true; return { ok: false, error }; },
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(bSettled, false, 'the second registration waits for the first');
  await a.query('commit');
  const result = await second;
  assert.equal(result.ok, false, 'the second registration is refused');
  assert.equal(result.error.message, 'already_registered');

  await a.query('reset role');
  const owners = await a.query(`select count(*)::int as n from merchant_staff where user_id = $1 and role = 'owner'`, [owner]);
  assert.equal(owners.rows[0].n, 1, 'one business, one owner row');
} finally {
  await a.end();
  await b.end();
}
