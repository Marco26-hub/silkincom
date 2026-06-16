import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { Link } from '@/i18n/navigation';

export const metadata = { title: 'Termini e Condizioni', description: 'Termini e condizioni di vendita SILKinCOM.' };

type Section = { h: string; body: string };

export default async function TerminiPage() {
  const t = await getTranslations('legalPages');
  const tt = await getTranslations('legalPages.termini');
  const tRec = await getTranslations('recesso');
  const notice = t('legalNotice');
  const sections = tt.raw('sections') as Section[];

  return (
    <LegalPage title={tt('title')} subtitle={tt('subtitle')}>
      {notice && (
        <p className="text-xs italic text-soft-grey border-l-2 border-gold-primary pl-4 mb-6"
           dangerouslySetInnerHTML={{ __html: notice }} />
      )}
      {sections.map((s, i) => (
        <div key={i}>
          <h2>{s.h}</h2>
          <div dangerouslySetInnerHTML={{ __html: s.body }} />
        </div>
      ))}

      {/* Pre-contractual disclosure of the right of withdrawal (art. 49 Cod. Consumo) */}
      <h2>{tRec('title')}</h2>
      <p>{tRec('intro')}</p>
      <p>
        <Link href="/recesso" className="text-gold-dark underline">
          {tRec('formHeading')} →
        </Link>
      </p>
    </LegalPage>
  );
}
