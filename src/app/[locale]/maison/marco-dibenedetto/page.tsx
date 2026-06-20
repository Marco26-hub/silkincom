import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { getStaticPage } from '@/data/static-pages';
import { APP_URL } from '@/lib/app-url';

const PROFILE_UI: Record<string, Record<string, string>> = {
  it: {
    chapter: 'Profilo del fondatore', education: 'Formazione', educationValue: 'Setificio di Como · Perito chimico tessile, 1998',
    territory: 'Territorio', territoryValue: 'Distretto tessile di Como', approach: 'Approccio', approachValue: 'Maison direct-to-consumer',
    imageAlt: 'Marco Dibenedetto, fondatore di SILKinCOM', imageCaption: 'Marco Dibenedetto · Fondatore',
    collections: 'Esplora le collezioni', story: 'La storia della Maison', signature: 'Conoscenza tecnica. Cultura del prodotto. Rapporto diretto.',
  },
  en: {
    chapter: 'Founder profile', education: 'Education', educationValue: 'Setificio di Como · Textile chemistry technician, 1998',
    territory: 'Territory', territoryValue: 'Como textile district', approach: 'Approach', approachValue: 'Direct-to-consumer Maison',
    imageAlt: 'Marco Dibenedetto, founder of SILKinCOM', imageCaption: 'Marco Dibenedetto · Founder',
    collections: 'Explore the collections', story: 'The Maison story', signature: 'Technical knowledge. Product culture. A direct relationship.',
  },
  es: {
    chapter: 'Perfil del fundador', education: 'Formación', educationValue: 'Setificio di Como · Perito químico textil, 1998',
    territory: 'Territorio', territoryValue: 'Distrito textil de Como', approach: 'Enfoque', approachValue: 'Maison direct-to-consumer',
    imageAlt: 'Marco Dibenedetto, fundador de SILKinCOM', imageCaption: 'Marco Dibenedetto · Fundador',
    collections: 'Explora las colecciones', story: 'La historia de la Maison', signature: 'Conocimiento técnico. Cultura de producto. Relación directa.',
  },
  fr: {
    chapter: 'Profil du fondateur', education: 'Formation', educationValue: 'Setificio di Como · Technicien chimiste textile, 1998',
    territory: 'Territoire', territoryValue: 'District textile de Côme', approach: 'Approche', approachValue: 'Maison direct-to-consumer',
    imageAlt: 'Marco Dibenedetto, fondateur de SILKinCOM', imageCaption: 'Marco Dibenedetto · Fondateur',
    collections: 'Explorer les collections', story: "L’histoire de la Maison", signature: 'Connaissance technique. Culture du produit. Relation directe.',
  },
  de: {
    chapter: 'Gründerprofil', education: 'Ausbildung', educationValue: 'Setificio di Como · Textilchemie-Techniker, 1998',
    territory: 'Herkunft', territoryValue: 'Textilbezirk von Como', approach: 'Ansatz', approachValue: 'Direct-to-Consumer Maison',
    imageAlt: 'Marco Dibenedetto, Gründer von SILKinCOM', imageCaption: 'Marco Dibenedetto · Gründer',
    collections: 'Kollektionen entdecken', story: 'Die Geschichte der Maison', signature: 'Technisches Wissen. Produktkultur. Direkte Beziehung.',
  },
  pt: {
    chapter: 'Perfil do fundador', education: 'Formação', educationValue: 'Setificio di Como · Perito químico têxtil, 1998',
    territory: 'Território', territoryValue: 'Distrito têxtil de Como', approach: 'Abordagem', approachValue: 'Maison direct-to-consumer',
    imageAlt: 'Marco Dibenedetto, fundador da SILKinCOM', imageCaption: 'Marco Dibenedetto · Fundador',
    collections: 'Explorar as coleções', story: 'A história da Maison', signature: 'Conhecimento técnico. Cultura do produto. Relação direta.',
  },
  nl: {
    chapter: 'Oprichtersprofiel', education: 'Opleiding', educationValue: 'Setificio di Como · Textielchemisch technicus, 1998',
    territory: 'Herkomst', territoryValue: 'Textieldistrict van Como', approach: 'Benadering', approachValue: 'Direct-to-consumer Maison',
    imageAlt: 'Marco Dibenedetto, oprichter van SILKinCOM', imageCaption: 'Marco Dibenedetto · Oprichter',
    collections: 'Ontdek de collecties', story: 'Het verhaal van de Maison', signature: 'Technische kennis. Productcultuur. Directe relatie.',
  },
};

function profileCopy(locale: string, key: string): string {
  return PROFILE_UI[locale]?.[key] ?? PROFILE_UI.en[key] ?? '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('founder');
  const page = await getStaticPage('maison-marco-dibenedetto', locale);
  const title = page?.metaTitle || t('metaTitle');
  const description = page?.metaDescription || t('metaDescription');
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const url = `${APP_URL}${prefix}/maison/marco-dibenedetto`;

  return {
    title,
    description,
    alternates: localizedAlternates(locale, '/maison/marco-dibenedetto'),
    openGraph: {
      type: 'profile',
      title,
      description,
      url,
      images: [{
        url: '/maison/marco-dibenedetto.webp',
        width: 857,
        height: 1221,
        alt: profileCopy(locale, 'imageAlt'),
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/maison/marco-dibenedetto.webp'],
    },
  };
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      const label = match[2];
      const url = match[3];
      if (url.startsWith('/')) {
        parts.push(<Link key={key++} href={url}>{label}</Link>);
      } else {
        parts.push(<a key={key++} href={url}>{label}</a>);
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function RichBody({ body }: { body: string }) {
  const blocks = body.split('\n').map((block) => block.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, index) =>
        block.startsWith('## ') ? (
          <h2 key={index}>{block.slice(3)}</h2>
        ) : (
          <p key={index}>{renderInline(block)}</p>
        )
      )}
    </>
  );
}

export default async function MarcoDibenedettoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('founder');
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const profileUrl = `${APP_URL}${prefix}/maison/marco-dibenedetto`;

  const personSchema = {
    '@type': 'Person',
    '@id': `${APP_URL}/maison/marco-dibenedetto#person`,
    name: 'Marco Dibenedetto',
    jobTitle: t('role'),
    description: t('metaDescription'),
    url: profileUrl,
    image: `${APP_URL}/maison/marco-dibenedetto.webp`,
    nationality: { '@type': 'Country', name: 'Italy' },
    worksFor: { '@id': `${APP_URL}/#organization` },
    affiliation: { '@id': `${APP_URL}/#organization` },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: 'ITIS Setificio di Como — I.S.I.S. Paolo Carcano',
    },
    knowsAbout: [
      'Como silk', 'Natural fibres', 'Textile chemistry', 'Jacquard weaving',
      'Textile printing', 'Textile finishing', 'Made in Italy', 'Direct-to-consumer fashion',
    ],
    workLocation: { '@type': 'Place', name: 'Como, Italy' },
    mainEntityOfPage: { '@id': `${profileUrl}#profile` },
  };
  const profileSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${profileUrl}#profile`,
    url: profileUrl,
    name: t('metaTitle'),
    description: t('metaDescription'),
    inLanguage: locale,
    isPartOf: { '@id': `${APP_URL}${prefix}/#website` },
    mainEntity: personSchema,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SILKinCOM', item: `${APP_URL}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: t('eyebrow'), item: `${APP_URL}${prefix}/la-nostra-storia` },
      { '@type': 'ListItem', position: 3, name: 'Marco Dibenedetto', item: profileUrl },
    ],
  };

  const facts = [
    [profileCopy(locale, 'education'), profileCopy(locale, 'educationValue')],
    [profileCopy(locale, 'territory'), profileCopy(locale, 'territoryValue')],
    [profileCopy(locale, 'approach'), profileCopy(locale, 'approachValue')],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="relative overflow-hidden bg-[#11100e] pt-32 text-warm-white md:pt-36">
        <div className="mx-auto grid min-h-[76svh] max-w-[1500px] md:grid-cols-[0.92fr_1.08fr]">
          <div className="relative z-10 flex flex-col justify-center px-7 py-16 sm:px-10 md:px-14 md:py-20 lg:px-20">
            <span className="mb-7 block h-px w-14 bg-gold-primary" />
            <span className="mb-5 text-[9px] uppercase tracking-[0.46em] text-gold-primary">
              SILKinCOM · {t('role')}
            </span>
            <h1 className="max-w-3xl font-display text-[3.55rem] font-light leading-[0.84] tracking-[-0.045em] sm:text-7xl lg:text-[6.6rem]">
              Marco <em className="block font-light italic text-gold-primary">Dibenedetto</em>
            </h1>
            <p className="mt-8 max-w-xl text-sm font-light leading-[1.85] text-warm-white/68 md:text-base">
              {t('metaDescription')}
            </p>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-4">
              <Link href="/la-nostra-storia" className="inline-flex items-center gap-2 border-b border-gold-primary/55 pb-1 text-[9px] uppercase tracking-[0.3em] text-gold-primary transition-colors hover:border-gold-primary hover:text-warm-white">
                {profileCopy(locale, 'story')} <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link href="/collezioni" className="inline-flex items-center gap-2 border-b border-warm-white/25 pb-1 text-[9px] uppercase tracking-[0.3em] text-warm-white/65 transition-colors hover:border-gold-primary hover:text-gold-primary">
                {profileCopy(locale, 'collections')} <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <figure className="relative min-h-[56svh] overflow-hidden border-l border-gold-primary/15 md:min-h-0">
            <Image
              src="/maison/marco-dibenedetto.webp"
              alt={profileCopy(locale, 'imageAlt')}
              fill
              priority
              sizes="(max-width: 767px) 100vw, 55vw"
              className="object-cover object-[center_28%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/15 md:bg-gradient-to-r md:from-[#11100e]/35 md:via-transparent md:to-transparent" />
            <div className="absolute inset-4 border border-gold-primary/25 sm:inset-6" />
            <figcaption className="absolute bottom-8 right-8 text-[8px] uppercase tracking-[0.35em] text-warm-white/70">
              {profileCopy(locale, 'imageCaption')}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-y border-gold-primary/20 bg-[#181613] text-warm-white">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 divide-y divide-gold-primary/15 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-10">
          {facts.map(([label, value]) => (
            <div key={label} className="px-5 py-7 text-center sm:py-9">
              <span className="block text-[8px] uppercase tracking-[0.35em] text-gold-primary">{label}</span>
              <span className="mt-2 block font-display text-lg font-light text-warm-white/85 sm:text-xl">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f2ede4] py-20 md:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-14 px-6 lg:grid-cols-[0.31fr_0.69fr] lg:gap-20 lg:px-10">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <span className="mb-4 block h-px w-12 bg-gold-primary" />
            <span className="text-[9px] uppercase tracking-[0.4em] text-gold-dark">{profileCopy(locale, 'chapter')}</span>
            <p className="mt-7 font-display text-3xl font-light leading-[1.12] text-soft-black">
              {profileCopy(locale, 'signature')}
            </p>
            <div className="mt-9 border-t border-soft-black/15 pt-6 text-[10px] font-light leading-[1.8] text-soft-black/55">
              <p>SILKinCOM</p>
              <p>Cermenate · Como · Italia</p>
              <a href="mailto:info@silkincom.com" className="transition-colors hover:text-gold-primary">info@silkincom.com</a>
            </div>
          </aside>

          <article className="min-w-0">
            <blockquote className="relative mb-14 border-y border-gold-primary/25 py-10 md:py-12">
              <span aria-hidden="true" className="absolute -top-4 left-0 font-display text-7xl font-light text-gold-primary/30">“</span>
              <p className="font-display text-2xl font-light italic leading-[1.45] text-soft-black md:text-3xl">
                {t('quote')}
              </p>
              <footer className="mt-5 text-[9px] uppercase tracking-[0.34em] text-gold-dark">Marco Dibenedetto · SILKinCOM</footer>
            </blockquote>

            <div className="prose prose-lg max-w-none break-words font-light leading-relaxed text-soft-black/80 prose-headings:mt-14 prose-headings:mb-5 prose-headings:font-display prose-headings:text-3xl prose-headings:font-light prose-headings:text-soft-black prose-p:leading-[1.9] prose-strong:font-medium prose-strong:text-soft-black prose-a:text-gold-dark hover:prose-a:text-gold-primary">
              <RichBody body={t('body')} />
            </div>

            <div className="mt-16 flex flex-wrap gap-4 border-t border-soft-black/15 pt-10">
              <Link href="/collezioni" className="inline-flex items-center gap-3 bg-soft-black px-7 py-4 text-[9px] uppercase tracking-[0.28em] text-warm-white transition-colors hover:bg-gold-primary hover:text-soft-black">
                {profileCopy(locale, 'collections')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/la-nostra-storia" className="inline-flex items-center gap-3 border border-soft-black/20 px-7 py-4 text-[9px] uppercase tracking-[0.28em] text-soft-black transition-colors hover:border-gold-primary hover:text-gold-dark">
                {t('ctaStory')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
