import { assertEquals, assertStringIncludes } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { handle } from '../notify-merchant-signup/handler.ts';
import { fakeCtx, fakeDeps, post } from './fakes.ts';

const PAYLOAD = { type: 'INSERT', table: 'merchants', record: { id: 'm1', trade_name: 'Kape ni Juan', category: 'cafe',
  city: 'Naga City', address: 'Magsaysay Ave', owner_mobile: '+639171234567', heard_from: 'facebook', created_at: '2026-11-06T00:00:00Z' } };

describe('notify-merchant-signup', () => {
  it('does nothing, successfully, without an API key', async () => {
    const response = await handle(post(PAYLOAD), fakeDeps(fakeCtx(), { FOUNDER_EMAIL: 'me@ugnaya.ph' }));
    assertEquals(await response.json(), { sent: false, reason: 'no_api_key' });
  });
  it('emails the founder through Resend', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchStub = (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Promise.resolve(new Response('{"id":"e1"}', { status: 200 }));
    };
    const response = await handle(post(PAYLOAD), fakeDeps(fakeCtx(), { RESEND_API_KEY: 're_test', FOUNDER_EMAIL: 'me@ugnaya.ph' }, fetchStub as typeof fetch));
    assertEquals(await response.json(), { sent: true });
    assertEquals(calls[0].url, 'https://api.resend.com/emails');
    assertEquals((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer re_test');
    const body = JSON.parse(String(calls[0].init.body));
    assertEquals(body.to, ['me@ugnaya.ph']);
    assertStringIncludes(body.subject, 'Kape ni Juan');
    assertStringIncludes(body.text, '+639171234567');
  });
  it('reports a Resend failure without failing the webhook', async () => {
    const fetchStub = () => Promise.resolve(new Response('nope', { status: 422 }));
    const response = await handle(post(PAYLOAD), fakeDeps(fakeCtx(), { RESEND_API_KEY: 're_test', FOUNDER_EMAIL: 'me@ugnaya.ph' }, fetchStub as typeof fetch));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { sent: false, reason: 'resend_422' });
  });
  it('refuses any other payload', async () => {
    const response = await handle(post({ type: 'UPDATE', table: 'merchants', record: {} }), fakeDeps(fakeCtx(), { RESEND_API_KEY: 'x' }));
    assertEquals(response.status, 400);
  });
});
