import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Informativa sul trattamento dei dati personali secondo il Regolamento UE 2016/679 (GDPR).',
};

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
