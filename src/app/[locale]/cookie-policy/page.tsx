import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('legalPages.cookies');
  return { title: t('title'), description: t('subtitle'), alternates: localizedAlternates(locale, '/cookie-policy') };
}

type Section = { h: string; body: string };

export default async function CookiePage() {
  const t = await getTranslations('legalPages');
  const tc = await getTranslations('legalPages.cookies');
  const notice = t('legalNotice');
  const intro = tc('intro');
  const sections = tc.raw('sections') as Section[];

  return (
    <LegalPage title={tc('title')} subtitle={tc('subtitle')}>
      {notice && (
        <p className="text-xs italic text-soft-grey border-l-2 border-gold-primary pl-4 mb-6"
           dangerouslySetInnerHTML={{ __html: notice }} />
      )}
      <p>{intro}</p>
      {sections.map((s, i) => (
        <div key={i}>
          <h2>{s.h}</h2>
          <div dangerouslySetInnerHTML={{ __html: s.body }} />
        </div>
      ))}
    </LegalPage>
  );
}
