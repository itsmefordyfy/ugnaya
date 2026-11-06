import type { Deps } from '../_shared/context.ts';
import { call } from '../_shared/errors.ts';
import { BadRequest, HttpError, optionalStringField, readBody, respond, Unauthorized, uuidField } from '../_shared/http.ts';
import { base32Encode, generateTotpSecret } from '../_shared/totp.ts';

/** Web wallet codes last as long as the platform setting web_code_minutes says (5). */
const WEB_CODE_MINUTES = 5;

type Profile = { user_id: string; public_member_id: string; deleted_at: string | null };
type IssuedToken = { token: string; expires_at: string; points_cost: number; reward_name: string };

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

/**
 * What the customer's QR codes are made from:
 * - device-secret: a TOTP secret for this phone (the app shows U:<member id>:<6 digits>)
 * - web-code: a single-use code for the web wallet (U:<member id>:W<code>, 5 minutes)
 * - redemption: a one-time token for one reward (R:<token>, 5 minutes)
 */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const { ctx } = deps;
    if (!ctx.userId || ctx.isAnonymous) throw new Unauthorized('sign_in_required');
    const profile = await ctx.selectOne<Profile>('customer_profiles', { user_id: ctx.userId });
    if (!profile || profile.deleted_at) throw new Unauthorized('sign_in_required');
    const body = await readBody(req);

    switch (body.action) {
      case 'device-secret': {
        const secret = generateTotpSecret();
        const { error } = await ctx.insert('customer_devices', {
          customer_id: profile.user_id,
          totp_secret: `\\x${hex(secret)}`,
          label: optionalStringField(body, 'label', 80),
        });
        if (error) throw new HttpError(500, 'internal', error.message);
        return { memberId: profile.public_member_id, secretBase32: base32Encode(secret) };
      }
      case 'web-code': {
        const code = base64url(crypto.getRandomValues(new Uint8Array(12)));
        const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))));
        const expiresAt = new Date(deps.now() + WEB_CODE_MINUTES * 60_000).toISOString();
        const { error } = await ctx.insert('member_web_codes', { code_hash: hash, customer_id: profile.user_id, expires_at: expiresAt });
        if (error) throw new HttpError(500, 'internal', error.message);
        return { memberCode: `U:${profile.public_member_id}:W${code}`, expiresAt };
      }
      case 'redemption': {
        const issued = await call<IssuedToken>(ctx, 'issue_redemption_token', {
          p_customer_id: profile.user_id,
          p_reward_id: uuidField(body, 'rewardId'),
        });
        return { redemptionCode: `R:${issued.token}`, expiresAt: issued.expires_at, pointsCost: issued.points_cost, rewardName: issued.reward_name };
      }
      default:
        throw new BadRequest('request_invalid', '"action" must be device-secret, web-code or redemption');
    }
  });
}
