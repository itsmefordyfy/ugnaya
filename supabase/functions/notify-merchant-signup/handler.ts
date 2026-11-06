import type { Deps } from '../_shared/context.ts';
import { BadRequest, readBody, respond } from '../_shared/http.ts';

type MerchantRecord = Record<string, unknown> & { id?: string; trade_name?: string };

/**
 * Called by the database webhook when a merchant registers: emails the founder through Resend.
 * Never fails the webhook: without a key, or if Resend refuses, it answers why and moves on.
 */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const body = await readBody(req);
    const record = body.record;
    if (body.type !== 'INSERT' || body.table !== 'merchants' || typeof record !== 'object' || record === null) {
      throw new BadRequest('request_invalid', 'Expected a merchants INSERT webhook');
    }
    const merchant = record as MerchantRecord;
    const apiKey = deps.env('RESEND_API_KEY');
    const founder = deps.env('FOUNDER_EMAIL');
    if (!apiKey) return { sent: false, reason: 'no_api_key' };
    if (!founder) return { sent: false, reason: 'no_founder_email' };

    const lines = ['trade_name', 'category', 'city', 'address', 'owner_mobile', 'heard_from', 'created_at', 'id']
      .map((key) => `${key.replaceAll('_', ' ')}: ${merchant[key] ?? '—'}`);
    try {
      const response = await deps.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'UGNAYA <noreply@ugnaya.ph>',
          to: [founder],
          subject: `New merchant sign-up: ${merchant.trade_name ?? 'unnamed'}`,
          text: `A business registered on ugnaya.ph and is waiting for verification.\n\n${lines.join('\n')}\n\nVerify it with: select verify_merchant('${merchant.id}', 'free', false);`,
        }),
      });
      if (!response.ok) return { sent: false, reason: `resend_${response.status}` };
      return { sent: true };
    } catch {
      return { sent: false, reason: 'resend_unreachable' };
    }
  });
}
