import { Badge } from '@ugnaya/web-ui';
import type { StatusLook } from '@/lib/labels';

export function StatusBadge({ look }: { look: StatusLook }) {
  return <Badge tone={look.tone} icon={look.icon} className="whitespace-nowrap">{look.label}</Badge>;
}
