import { getTranslations } from 'next-intl/server';
import { CartPageClient } from '@/components/cart/CartPageClient';

export async function generateMetadata() {
  const t = await getTranslations('cart');
  return { title: t('title') };
}

export default function CartPage() {
  return <CartPageClient />;
}
