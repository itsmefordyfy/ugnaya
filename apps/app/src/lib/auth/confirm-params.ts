import { safeNext } from './redirects.ts';

/** The OTP types Supabase can put in a confirmation link. */
const OTP_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
export type OtpType = (typeof OTP_TYPES)[number];

export type ConfirmRequest =
  | { kind: 'otp'; tokenHash: string; type: OtpType; next: string }
  | { kind: 'code'; code: string; next: string }
  | { kind: 'none'; next: string };

/**
 * What a confirmation link brought back. A custom email template (needs a paid plan or custom SMTP) sends
 * `token_hash` and `type`; Supabase's default email sends a one-time `code` for the PKCE flow. Both are accepted.
 */
export function confirmRequest(params: URLSearchParams): ConfirmRequest {
  // Default to the front door, which sends each kind of account to its own home.
  const next = safeNext(params.get('next')) ?? '/';
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash && type && (OTP_TYPES as readonly string[]).includes(type)) {
    return { kind: 'otp', tokenHash, type: type as OtpType, next };
  }
  const code = params.get('code');
  if (code) return { kind: 'code', code, next };
  return { kind: 'none', next };
}
