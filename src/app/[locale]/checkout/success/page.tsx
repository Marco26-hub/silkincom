import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SuccessClient } from './SuccessClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('newsletterPages');
  return {
    title: t('checkoutSuccess.metaTitle'),
    robots: { index: false },
  };
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessClient />
    </Suspense>
  );
}
