import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';
import { TERMS, TERMS_UPDATED } from '@/content/terms';

export const metadata: Metadata = { title: 'Terms of Use', description: 'The terms for customers using the UGNAYA wallet: accounts, points and rewards.' };

export default function Terms() {
  return <LegalPage title="Terms of Use" updated={TERMS_UPDATED} markdown={TERMS} />;
}
