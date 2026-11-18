import type { Metadata } from 'next';
import { FaqList } from '@/components/marketing/faq-list';
import { Section } from '@/components/ui/section';
import { FAQ } from '@/lib/faq';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Questions about UGNAYA from shop owners and customers: cost, apps, rewards, points expiry and privacy.',
};

export default function Faq() {
  return (
    <>
      <Section eyebrow="FAQ" title="For shop owners">
        <FaqList items={FAQ.filter((item) => item.audience === 'merchant')} />
      </Section>
      <Section tone="card" title="For customers">
        <FaqList items={FAQ.filter((item) => item.audience === 'customer')} />
      </Section>
    </>
  );
}
