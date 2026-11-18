import type { Deps } from '../_shared/context.ts';
import { BadRequest, readBody, respond } from '../_shared/http.ts';

type Payload = {
  id: string;
  title: string | null;
  body: string | null;
  kind: string | null;
  data: Record<string, unknown> | null;
  allowed: boolean;
  tokens: string[];
};

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

/**
 * Called by the database webhook when a notification row is written: sends the push copy of an in-app
 * notification to the customer's phones through Expo's push service (APNs and FCM behind it), if the customer
 * allows that kind. Never fails the webhook; an Expo failure leaves the row unmarked so a retry can send it.
 */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const body = await readBody(req);
    const record = body.record as Record<string, unknown> | null;
    if (body.type !== 'INSERT' || body.table !== 'notifications' || typeof record !== 'object' || record === null) {
      throw new BadRequest('request_invalid', 'Expected a notifications INSERT webhook');
    }
    if (record.channel !== 'in_app' || typeof record.id !== 'string') return { sent: 0, reason: 'not_in_app' };

    const { data, error } = await deps.ctx.rpc<Payload>('push_payload', { p_notification_id: record.id });
    if (error) throw new Error(error.message);
    if (!data) return { sent: 0, reason: 'already_pushed' };
    if (!data.allowed) {
      await deps.ctx.rpc('mark_pushed', { p_notification_id: data.id });
      return { sent: 0, reason: 'not_allowed' };
    }
    if (data.tokens.length === 0) {
      await deps.ctx.rpc('mark_pushed', { p_notification_id: data.id });
      return { sent: 0, reason: 'no_tokens' };
    }

    const messages = data.tokens.map((to) => ({
      to,
      title: data.title ?? 'UGNAYA',
      body: data.body ?? '',
      data: { ...(data.data ?? {}), kind: data.kind, notification_id: data.id },
      sound: 'default',
    }));
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const accessToken = deps.env('EXPO_ACCESS_TOKEN');
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      const response = await deps.fetch(EXPO_PUSH, { method: 'POST', headers, body: JSON.stringify(messages) });
      if (!response.ok) return { sent: 0, reason: `expo_${response.status}` };
    } catch {
      return { sent: 0, reason: 'expo_unreachable' };
    }
    await deps.ctx.rpc('mark_pushed', { p_notification_id: data.id });
    return { sent: messages.length };
  });
}
