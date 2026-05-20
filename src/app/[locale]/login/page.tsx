import { getTranslations } from 'next-intl/server';
import { LoginClient } from './LoginClient';

export async function generateMetadata() {
  const t = await getTranslations('auth.login');
  return {
    title: t('title'),
    description: t('subtitle'),
    robots: { index: false },
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
