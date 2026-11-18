import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { handle } from '../push-dispatch/handler.ts';
import { fakeCtx, fakeDeps, post } from './fakes.ts';

const webhook = (record: Record<string, unknown>) => ({ type: 'INSERT', table: 'notifications', record });
const IN_APP = { id: 'n1', channel: 'in_app', recipient_id: 'c1' };
const payload = (overrides: Record<string, unknown> = {}) => ({
  id: 'n1', title: 'You earned 20 points', body: 'At Kape ni Juan.', kind: 'points_earned', data: { transaction_id: 't1' },
  allowed: true, tokens: ['ExponentPushToken[aaaaaaaaaaaa]'], ...overrides,
});

describe('push-dispatch', () => {
  it('sends the notification to every token of the customer through Expo, then marks it pushed', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchStub = (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Promise.resolve(new Response('{"data":[{"status":"ok"}]}', { status: 200 }));
    };
    const ctx = fakeCtx({ rpc: { push_payload: () => payload(), mark_pushed: () => null } });
    const response = await handle(post(webhook(IN_APP)), fakeDeps(ctx, {}, fetchStub as typeof fetch));
    assertEquals(await response.json(), { sent: 1 });
    assertEquals(calls[0].url, 'https://exp.host/--/api/v2/push/send');
    const body = JSON.parse(String(calls[0].init.body));
    assertEquals(body, [{ to: 'ExponentPushToken[aaaaaaaaaaaa]', title: 'You earned 20 points', body: 'At Kape ni Juan.',
      data: { transaction_id: 't1', kind: 'points_earned', notification_id: 'n1' }, sound: 'default' }]);
    assertEquals(ctx.rpcCalls.map((c) => c.fn), ['push_payload', 'mark_pushed']);
  });
  it('sends nothing when the customer turned that kind off, and still marks it handled', async () => {
    const ctx = fakeCtx({ rpc: { push_payload: () => payload({ allowed: false }), mark_pushed: () => null } });
    const response = await handle(post(webhook(IN_APP)), fakeDeps(ctx));
    assertEquals(await response.json(), { sent: 0, reason: 'not_allowed' });
    assertEquals(ctx.rpcCalls.map((c) => c.fn), ['push_payload', 'mark_pushed']);
  });
  it('sends nothing without a token', async () => {
    const ctx = fakeCtx({ rpc: { push_payload: () => payload({ tokens: [] }), mark_pushed: () => null } });
    assertEquals(await (await handle(post(webhook(IN_APP)), fakeDeps(ctx))).json(), { sent: 0, reason: 'no_tokens' });
  });
  it('ignores rows that are not in-app notifications, and repeats of one already pushed', async () => {
    const ctx = fakeCtx({ rpc: { push_payload: () => null } });
    assertEquals(await (await handle(post(webhook({ ...IN_APP, channel: 'email' })), fakeDeps(ctx))).json(), { sent: 0, reason: 'not_in_app' });
    assertEquals(await (await handle(post(webhook(IN_APP)), fakeDeps(ctx))).json(), { sent: 0, reason: 'already_pushed' });
  });
  it('reports an Expo failure without failing the webhook (and leaves it unmarked for a retry)', async () => {
    const fetchStub = () => Promise.resolve(new Response('busy', { status: 503 }));
    const ctx = fakeCtx({ rpc: { push_payload: () => payload(), mark_pushed: () => null } });
    const response = await handle(post(webhook(IN_APP)), fakeDeps(ctx, {}, fetchStub as typeof fetch));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { sent: 0, reason: 'expo_503' });
    assertEquals(ctx.rpcCalls.map((c) => c.fn), ['push_payload']);
  });
  it('refuses any other payload', async () => {
    const response = await handle(post({ type: 'UPDATE', table: 'notifications', record: {} }), fakeDeps(fakeCtx()));
    assertEquals(response.status, 400);
  });
});
