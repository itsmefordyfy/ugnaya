import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';
import { MERCHANT_TERMS, MERCHANT_TERMS_UPDATED } from '@/content/merchant-terms';

export const metadata: Metadata = { title: 'Merchant Terms', description: 'The terms for businesses using UGNAYA: subscriptions, rewards, staff, customer data.' };

export default function MerchantTerms() {
  return <LegalPage title="Merchant Terms" updated={MERCHANT_TERMS_UPDATED} markdown={MERCHANT_TERMS} />;
}
