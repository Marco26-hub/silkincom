import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { localizedAlternates } from '@/i18n/routing';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { Link } from '@/i18n/navigation';
import { editorialMarkdown, editorialPlainText, editorialHref, jsonLd } from '@/lib/editorial-text';

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

function Answer({ text }: { text: string }) {
  return editorialMarkdown(text).split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!match) return part;
    const href = editorialHref(match[2]);
    if (!href) return match[1];
    return href.startsWith('/')
      ? <Link key={i} href={href}>{match[1]}</Link>
      : <a key={i} href={href}>{match[1]}</a>;
  });
}

export default async function FaqPage() {
  const t = await getTranslations('faq');
  const faqs = t.raw('faqs') as Faq[];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: editorialPlainText(f.a) },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
      <LegalPage title={t('title')}>
        {faqs.map((f, i) => (
          <div key={i}>
            <h2>{f.q}</h2>
            <p><Answer text={f.a} /></p>
          </div>
        ))}
      </LegalPage>
    </>
  );
}
