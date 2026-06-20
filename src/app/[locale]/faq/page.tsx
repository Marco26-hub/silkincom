import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { localizedAlternates } from '@/i18n/routing';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('faq');
  return {
    title: t('title'),
    description: (t.raw('faqs') as Faq[]).slice(0, 2).map((faq) => faq.q).join(' · '),
    alternates: localizedAlternates(locale, '/faq'),
  };
}

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
      <BreadcrumbSchema
        trail={[
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
      />
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
