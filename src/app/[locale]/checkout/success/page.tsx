import { Suspense } from 'react';
import { Metadata } from 'next';
import { SuccessClient } from './SuccessClient';

export const metadata: Metadata = {
  title: 'Ordine confermato — SILKinCOM',
  robots: { index: false },
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessClient />
    </Suspense>
  );
}
