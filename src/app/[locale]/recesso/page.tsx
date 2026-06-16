import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { RecessoForm } from '@/components/recesso/RecessoForm';

export async function generateMetadata() {
  const t = await getTranslations('recesso');
  return {
    title: `${t('title')} — SILKinCOM`,
    description: t('intro'),
  };
}

export default async function RecessoPage() {
  const t = await getTranslations('recesso');

  return (
    <LegalPage title={t('title')} subtitle={t('subtitle')}>
      <p>{t('intro')}</p>

      <h2>{t('s1')}</h2>
      <p>{t('s1Body')}</p>

      <h2>{t('s2')}</h2>
      <p>{t('s2Body')}</p>

      <h2>{t('s3')}</h2>
      <p>{t('s3Body')}</p>

      <h2>{t('s4')}</h2>
      <p>{t('s4Body')}</p>

      <h2>{t('formHeading')}</h2>
      <RecessoForm />
    </LegalPage>
  );
}
