import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { localizedAlternates } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('spedizioniPage');
  return { title: t('title'), description: t('subtitle'), alternates: localizedAlternates(locale, '/spedizioni') };
}

export default async function SpedizioniPage() {
  const t = await getTranslations('spedizioniPage');
  const items1 = t.raw('section1Items') as string[];
  const items2 = t.raw('section2Items') as string[];
  const items3 = t.raw('section3Items') as string[];
  const items4 = t.raw('section4Items') as string[];

  return (
    <LegalPage title={t('title')} subtitle={t('subtitle')}>
      <h2>{t('section1')}</h2>
      <ul>
        {items1.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{t('section2')}</h2>
      <ul>
        {items2.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{t('section3')}</h2>
      <ul>
        {items3.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{t('section4')}</h2>
      <ul>
        {items4.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{t('section5')}</h2>
      <p>{t('section5Body')}</p>

      <h2>{t('section6')}</h2>
      <p>{t('section6Body')}</p>
    </LegalPage>
  );
}
