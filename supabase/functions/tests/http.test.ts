import { assertEquals, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { BadRequest, Forbidden, intField, readBody, respond, stringField } from '../_shared/http.ts';
import { post } from './fakes.ts';

describe('http helpers', () => {
  it('reads a JSON object body', async () => {
    assertEquals(await readBody(post({ a: 1 })), { a: 1 });
  });
  it('refuses non-JSON and arrays', async () => {
    await assertRejects(() => readBody(post('not json')), BadRequest);
    await assertRejects(() => readBody(post([1, 2])), BadRequest);
  });
  it('reads fields strictly', () => {
    assertEquals(intField({ n: 10 }, 'n'), 10);
    let threw = 0;
    for (const body of [{ n: 10.5 }, { n: '10' }, {}]) { try { intField(body, 'n'); } catch (e) { if (e instanceof BadRequest) threw++; } }
    assertEquals(threw, 3);
    try { stringField({ s: '' }, 's'); } catch (e) { assertEquals(e instanceof BadRequest, true); }
  });
  it('turns errors into JSON responses', async () => {
    const forbidden = await respond(() => { throw new Forbidden('device_not_allowed'); });
    assertEquals(forbidden.status, 403);
    assertEquals(await forbidden.json(), { error: 'device_not_allowed' });
    const crash = await respond(() => { throw new Error('boom'); });
    assertEquals(crash.status, 500);
    assertEquals(await crash.json(), { error: 'internal' });
    const ok = await respond(() => Promise.resolve({ fine: true }));
    assertEquals(await ok.json(), { fine: true });
  });
});
