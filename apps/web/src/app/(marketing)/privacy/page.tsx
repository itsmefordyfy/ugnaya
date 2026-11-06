import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';
import { PRIVACY, PRIVACY_UPDATED } from '@/content/privacy';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'What personal data UGNAYA collects, why, who sees it, and your rights.' };

export default function Privacy() {
  return <LegalPage title="Privacy Policy" updated={PRIVACY_UPDATED} markdown={PRIVACY} />;
}
