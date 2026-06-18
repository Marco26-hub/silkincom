import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { RecessoForm } from '@/components/recesso/RecessoForm';

// The admin kill-switch for this page is enforced in middleware (it returns a
// real 404 when disabled — notFound() here would render with a 200 status).

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

      <h2>{t('costiHeading')}</h2>
      <p>{t('costiBody')}</p>

      <h2>{t('formHeading')}</h2>
      <RecessoForm />

      <h2>{t('moduloHeading')}</h2>
      <p>{t('moduloIntro')}</p>
      <div className="whitespace-pre-line border border-pearl-grey/60 bg-ivory p-5 text-sm leading-relaxed text-soft-black/80">
        {t('moduloBody')}
      </div>
    </LegalPage>
  );
}
