import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { APP_URL } from '@/lib/app-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('founder');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates(locale, '/maison/marco-dibenedetto'),
  };
}

// Inline renderer: paragraphs split by blank line; "## " -> h2; inline
// **bold** -> <strong> and [text](/url) -> locale-aware <Link> (internal) or
// <a> (http/mailto). Mirrors the blog body renderer so editorial copy can live
// in messages and be translated like any other string.
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={k++}>{m[1]}</strong>);
    } else {
      const label = m[2];
      const url = m[3];
      if (url.startsWith('/')) {
        parts.push(<Link key={k++} href={url}>{label}</Link>);
      } else {
        parts.push(<a key={k++} href={url}>{label}</a>);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function RichBody({ body }: { body: string }) {
  const blocks = body.split('\n\n').filter(Boolean);
  return (
    <>
      {blocks.map((b, i) =>
        b.startsWith('## ') ? (
          <h2 key={i}>{b.slice(3)}</h2>
        ) : (
          <p key={i}>{renderInline(b)}</p>
        )
      )}
    </>
  );
}

export default async function MarcoDibenedettoPage() {
  const t = await getTranslations('founder');

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${APP_URL}/maison/marco-dibenedetto#person`,
    name: 'Marco Dibenedetto',
    jobTitle: t('role'),
    worksFor: { '@id': `${APP_URL}/#organization` },
    affiliation: { '@id': `${APP_URL}/#organization` },
    url: `${APP_URL}/maison/marco-dibenedetto`,
    nationality: { '@type': 'Country', name: 'Italia' },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: 'ITIS Setificio di Como (Istituto di Istruzione Superiore "Paolo Carcano")',
      description:
        'Storica scuola tessile fondata nel 1869 nel distretto serico di Como, formazione tecnica in chimica tessile, tessitura, stampa e finissaggio.',
    },
    knowsAbout: [
      'Seta di Como', 'Cashmere', 'Made in Italy', 'Tessile di lusso',
      'Distretto serico comasco', 'Chimica tessile', 'Tessitura jacquard',
      'Stampa serigrafica', 'Orlatura rouletté', 'Finissaggio tessile',
    ],
    description: t('metaDescription'),
    homeLocation: { '@type': 'Place', name: 'Cermenate, Como, Italia' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Maison', item: `${APP_URL}/maison/marco-dibenedetto` },
      { '@type': 'ListItem', position: 3, name: 'Marco Dibenedetto', item: `${APP_URL}/maison/marco-dibenedetto` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="pt-28 md:pt-44 pb-16 bg-ivory">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('eyebrow')}
          </span>
          <h1 className="font-display font-light text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-soft-black mb-6">
            Marco Dibenedetto
          </h1>
          <p className="font-display italic text-xl md:text-2xl text-soft-black/80">
            {t('role')} — SILKinCOM
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-warm-white">
        <article className="max-w-3xl mx-auto px-6 prose prose-lg font-light text-soft-black/85 leading-relaxed prose-headings:font-display prose-headings:font-light prose-headings:text-soft-black prose-headings:mt-14 prose-headings:mb-5 prose-a:text-gold-primary hover:prose-a:text-gold-dark prose-p:leading-[1.85]">
          <p className="text-xl font-display italic text-soft-black/90 mb-12 pb-10 border-b border-pearl-grey/50 text-center">
            &ldquo;{t('quote')}&rdquo;
          </p>

          <RichBody body={t('body')} />

          <p className="mt-12 text-center not-prose">
            <Link
              href="/la-nostra-storia"
              className="inline-block px-8 py-3 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-colors no-underline"
            >
              {t('ctaStory')}
            </Link>
          </p>
        </article>
      </section>
    </>
  );
}
