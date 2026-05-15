import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';

export const metadata = { title: 'Cookie Policy', description: 'Informativa sui cookie utilizzati dal sito SILKinCOM.' };

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
