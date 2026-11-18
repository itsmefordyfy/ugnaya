import { Badge } from '@ugnaya/web-ui';
import { STATUS_INFO } from '@/lib/application';
import type { MerchantStatus } from '@/lib/auth/access';

/** The application status as a pill: a word and an icon, never colour alone. */
export function StatusBadge({ status }: { status: MerchantStatus }) {
  const info = STATUS_INFO[status];
  const tone = info.tone === 'neutral' ? 'neutral' : info.tone;
  return <Badge tone={tone} icon={info.icon}>{info.label}</Badge>;
}
