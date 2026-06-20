import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('legalPages.privacy');
  return { title: t('title'), description: t('subtitle'), alternates: localizedAlternates(locale, '/privacy-policy') };
}

type Section = { h: string; body: string };

export default async function PrivacyPage() {
  const t = await getTranslations('legalPages');
  const tp = await getTranslations('legalPages.privacy');
  const notice = t('legalNotice');
  const intro = tp('intro');
  const sections = tp.raw('sections') as Section[];

  return (
    <LegalPage title={tp('title')} subtitle={tp('subtitle')}>
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
