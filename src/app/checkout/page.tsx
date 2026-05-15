import { Metadata } from 'next';
import { CheckoutClient } from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout — SILKinCOM',
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
