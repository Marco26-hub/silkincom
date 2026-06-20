import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { Link } from '@/i18n/navigation';
import { localizedAlternates } from '@/i18n/routing';
import { APP_URL } from '@/lib/app-url';
import { getGlossaryContent } from '@/data/glossary';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getGlossaryContent(locale);

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: localizedAlternates(locale, '/glossario'),
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      type: 'article',
    },
  };
}

export default async function GlossarioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const content = getGlossaryContent(locale);
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const pageUrl = `${APP_URL}${prefix}/glossario`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: content.terms.map((term) => ({
      '@type': 'Question',
      name: content.questionTemplate.replace('{term}', term.term),
      acceptedAnswer: {
        '@type': 'Answer',
        text: term.long,
      },
    })),
  };

  const definedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${pageUrl}#glossary`,
    url: pageUrl,
    name: content.schemaName,
    inLanguage: locale,
    hasDefinedTerm: content.terms.map((term, index) => ({
      '@type': 'DefinedTerm',
      '@id': `${pageUrl}#term-${index + 1}`,
      name: term.term,
      description: term.long,
      inDefinedTermSet: `${pageUrl}#glossary`,
    })),
  };

  return (
    <>
      <BreadcrumbSchema
        locale={locale}
        trail={[
          { name: nav('home'), path: '/' },
          { name: content.breadcrumb, path: '/glossario' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }}
      />

      <section className="relative overflow-hidden bg-soft-black pb-20 pt-32 text-warm-white md:pb-28 md:pt-44">
        <div className="absolute inset-x-6 top-20 h-px bg-gradient-to-r from-transparent via-gold-primary/50 to-transparent md:inset-x-16" />
        <div className="absolute -right-20 top-12 size-72 rounded-full border border-gold-primary/10 md:size-[28rem]" />
        <div className="absolute -right-8 top-24 size-52 rounded-full border border-gold-primary/10 md:size-[22rem]" />
        <div className="relative mx-auto max-w-5xl px-6 text-center lg:px-10">
          <span className="mb-7 block text-[10px] uppercase tracking-[0.5em] text-gold-primary">
            {content.eyebrow}
          </span>
          <h1 className="font-display text-5xl font-light leading-[0.96] sm:text-6xl md:text-7xl lg:text-[6.5rem]">
            {content.h1Start}{' '}
            <em className="block pt-2 text-gold-primary sm:inline sm:pt-0">
              {content.h1Emphasis}
            </em>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base font-light leading-8 text-warm-white/70 md:text-lg">
            {content.intro}
          </p>
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <nav
            aria-label={content.index}
            className="border border-soft-black/10 bg-warm-white px-6 py-7 shadow-[0_20px_60px_rgba(25,22,18,0.05)] md:px-10"
          >
            <p className="mb-5 text-[10px] uppercase tracking-[0.35em] text-gold-dark">
              {content.index}
            </p>
            <ol className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3 lg:grid-cols-4">
              {content.terms.map((term, index) => (
                <li key={term.term}>
                  <a
                    href={`#term-${index + 1}`}
                    className="group flex items-baseline gap-2 text-soft-black/75 transition-colors hover:text-gold-dark"
                  >
                    <span className="font-display text-xs text-gold-primary/80">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{term.term}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <dl className="mt-16 grid gap-px overflow-hidden border border-soft-black/10 bg-soft-black/10 md:mt-20 md:grid-cols-2">
            {content.terms.map((term, index) => (
              <article
                id={`term-${index + 1}`}
                key={term.term}
                className="scroll-mt-32 bg-warm-white p-7 md:min-h-[22rem] md:p-10"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-display text-sm text-gold-dark">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="h-px w-12 bg-gold-primary/60" />
                </div>
                <dt className="font-display text-3xl font-light leading-tight text-soft-black md:text-4xl">
                  {term.term}
                </dt>
                <dd className="mt-6">
                  <p className="text-base leading-7 text-soft-black/90">{term.short}</p>
                  <p className="mt-4 text-sm font-light leading-7 text-soft-black/65">
                    {term.long}
                  </p>
                </dd>
              </article>
            ))}
          </dl>

          <div className="mt-20 border-y border-soft-black/10 py-12 text-center md:mt-24 md:py-16">
            <p className="font-display text-2xl font-light text-soft-black md:text-3xl">
              {content.ctaPrompt}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/trame-di-como/storia-della-seta-a-como"
                className="inline-flex min-h-12 items-center justify-center bg-soft-black px-7 text-[10px] uppercase tracking-[0.24em] text-warm-white transition-colors hover:bg-gold-primary hover:text-soft-black"
              >
                {content.ctaHistory}
              </Link>
              <Link
                href="/materiali"
                className="inline-flex min-h-12 items-center justify-center border border-soft-black px-7 text-[10px] uppercase tracking-[0.24em] text-soft-black transition-colors hover:bg-soft-black hover:text-warm-white"
              >
                {nav('materials')}
              </Link>
              <Link
                href="/trame-di-como/come-riconoscere-seta-vera"
                className="inline-flex min-h-12 items-center justify-center border border-soft-black px-7 text-[10px] uppercase tracking-[0.24em] text-soft-black transition-colors hover:bg-soft-black hover:text-warm-white"
              >
                {content.ctaAuthenticity}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
