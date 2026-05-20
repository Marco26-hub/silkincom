import { AccountClient } from './AccountClient';

export const metadata = {
  title: 'Il mio account',
  description: 'Gestisci ordini, indirizzi, wishlist e profilo del tuo account SILKinCOM.',
  robots: { index: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
