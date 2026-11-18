import 'server-only';
import { headers } from 'next/headers';
import { clientIp } from './access';

/** Who and from where, attached to every audited admin action (the database stores request id, IP and user agent). */
export async function requestContext(): Promise<{ request_id: string; ip: string | null; user_agent: string | null }> {
  const h = await headers();
  return {
    request_id: h.get('x-vercel-id') ?? crypto.randomUUID(),
    ip: clientIp(h),
    user_agent: h.get('user-agent'),
  };
}
