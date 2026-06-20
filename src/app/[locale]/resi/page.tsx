import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { localizedAlternates } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('resi');
  return { title: t('title'), description: t('subtitle'), alternates: localizedAlternates(locale, '/resi') };
}

export default async function ResiPage() {
  const t = await getTranslations('resi');
  const s3Items = t.raw('s3Items') as string[];
  const s4Items = t.raw('s4Items') as string[];

  return (
    <LegalPage title={t('title')} subtitle={t('subtitle')}>
      <h2>{t('s1')}</h2>
      <p>{t('s1Body')}</p>

      <h2>{t('s2')}</h2>
      <p>{t('s2Body')}</p>

      <h2>{t('s3')}</h2>
      <p>{t('s3Body')}</p>
      <ul>
        {s3Items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      <p>{t('s3Note')}</p>

      <h2>{t('s4')}</h2>
      <p>{t('s4Body')}</p>
      <ul>
        {s4Items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{t('s5')}</h2>
      <p>{t('s5Body1')}</p>
      <p><strong>{t('s5AddressLabel')}</strong><br />
      SILKinCOM<br />
      Via Giuseppe Verdi 2/B<br />
      22072 Cermenate (CO) – Italia</p>

      <h2>{t('s6')}</h2>
      <p>{t('s6Body')}</p>

      <h2>{t('s7')}</h2>
      <p>{t('s7Body')} <a href="mailto:silkincom.business@gmail.com">silkincom.business@gmail.com</a>.</p>
    </LegalPage>
  );
}
