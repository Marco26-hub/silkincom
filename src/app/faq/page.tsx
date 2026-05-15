import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';

export const metadata = {
  title: 'FAQ — Domande frequenti',
  description: 'Risposte alle domande più frequenti sui prodotti, ordini, spedizioni e resi SILKinCOM.',
};

type Faq = { q: string; a: string };

export default async function FaqPage() {
  const t = await getTranslations('faq');
  const faqs = t.raw('faqs') as Faq[];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <LegalPage title={t('title')}>
        {faqs.map((f, i) => (
          <div key={i}>
            <h2>{f.q}</h2>
            <p dangerouslySetInnerHTML={{ __html: f.a }} />
          </div>
        ))}
      </LegalPage>
    </>
  );
}
