import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getPostSlugs, getPosts, getPost } from '@/data/posts';
import { localizedAlternates } from '@/i18n/routing';
import { ArrowUpRight } from 'lucide-react';
import { APP_URL } from '@/lib/app-url';

// Inline markdown-link parser for post bodies: turns [anchor](/url) into a
// real link (internal -> next-intl <Link>, external -> <a>). The body renderer
// printed paragraphs as raw text, so internal links (the whole point of a
// link-bait post) never rendered. This enables them for every post.
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const label = m[1];
    const url = m[2];
    if (url.startsWith('/')) {
      parts.push(
        <Link key={k++} href={url} className="text-gold-primary hover:text-gold-dark">{label}</Link>
      );
    } else {
      parts.push(
        <a key={k++} href={url} target="_blank" rel="noopener noreferrer" className="text-gold-primary hover:text-gold-dark">{label}</a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

// External citation references appended to pillar posts. Strengthens
// E-E-A-T and gives AI grounding back-links to authoritative sources.
const CITATIONS: Record<string, Array<{ label: string; url: string }>> = {
  'storia-della-seta-a-como': [
    { label: 'Distretto serico di Como — Wikipedia', url: 'https://it.wikipedia.org/wiki/Distretto_serico_di_Como' },
    { label: 'Bachicoltura italiana — Wikipedia', url: 'https://it.wikipedia.org/wiki/Bachicoltura' },
    { label: 'Mantero Seta', url: 'https://www.mantero.com/' },
    { label: 'Ratti S.p.A.', url: 'https://www.ratti.it/' },
    { label: 'Camera di Commercio di Como — distretto tessile', url: 'https://www.co.camcom.it/' },
  ],
  'cashmere-mongolo-vs-cinese': [
    { label: 'Capra cashmere — Wikipedia', url: 'https://it.wikipedia.org/wiki/Capra_cashmere' },
    { label: 'Cashmere — Wikipedia', url: 'https://it.wikipedia.org/wiki/Cashmere_(tessuto)' },
  ],
  'pashmina-vs-sciarpa-differenze': [
    { label: 'Pashmina — Wikipedia', url: 'https://it.wikipedia.org/wiki/Pashmina' },
    { label: 'Changthangi — Wikipedia', url: 'https://en.wikipedia.org/wiki/Changthangi' },
  ],
  'come-riconoscere-seta-vera': [
    { label: 'Seta — Wikipedia', url: 'https://it.wikipedia.org/wiki/Seta' },
    { label: 'Bombyx mori — Wikipedia', url: 'https://it.wikipedia.org/wiki/Bombyx_mori' },
  ],
};

// Posts that follow a step-by-step structure also emit schema.org HowTo
// for better discoverability in voice search and AI/GEO surfaces.
const HOWTO_POSTS: Record<string, { totalTime: string; steps: Array<{ name: string; text: string }> }> = {
  'come-riconoscere-seta-vera': {
    totalTime: 'PT3M',
    steps: [
      { name: 'Prova del tatto', text: 'Sfrega il tessuto tra le dita per dieci secondi: la seta autentica si riscalda piano e ridistribuisce il calore. Il poliestere resta freddo o si surriscalda.' },
      { name: 'Prova del nodo', text: "Annoda il foulard e tira delicatamente: la seta conserva il nodo e poi si scioglie con un drappeggio naturale. Il poliestere scatta via o resta stropicciato." },
      { name: 'Prova del fuoco', text: "Su una fibra del bordo: la seta brucia lentamente, lascia cenere friabile e nera e un odore di capello bruciato. Il poliestere fonde e fa una pallina dura." },
      { name: 'Prova della luce', text: "La seta riflette la luce con lucentezza profonda e iridescente che cambia con l'angolazione. Il poliestere riflette in modo piatto, quasi metallico." },
      { name: 'Prova del prezzo', text: 'Servono circa 2.500 bozzoli per un metro di tessuto: un foulard di pura seta sotto i €40–50 è statisticamente improbabile.' },
      { name: "Prova dell'etichetta", text: 'Cerca "100% seta" o "100% silk". Etichette generiche come "seta naturale" o "seta-poliestere" sono campanelli d\'allarme.' },
      { name: "Prova dell'orlo", text: "Una seta di qualità ha l'orlo cucito a mano (rouletté arrotolato verso l'interno), non tagliato a macchina o termo-sigillato." },
    ],
  },
};

// ISR: refresh CMS-backed post pages at most every 2 min; new slugs render
// on-demand (dynamicParams defaults to true).
export const revalidate = 120;

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await getPost(slug, locale);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description.slice(0, 160),
    alternates: localizedAlternates(locale, `/trame-di-como/${slug}`),
    openGraph: { images: p.image ? [p.image] : [] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await getPost(slug, locale);
  if (!post) notFound();

  const t = await getTranslations('journal');
  const paragraphs = post.body.split('\n\n').filter(Boolean);
  const others = (await getPosts(locale)).filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleUrl = `${APP_URL}/trame-di-como/${post.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image ? [post.image.startsWith('http') ? post.image : `${APP_URL}${post.image}`] : [],
    datePublished: post.date || undefined,
    dateModified: post.date || undefined,
    author: {
      '@type': 'Person',
      name: 'Marco Dibenedetto',
      jobTitle: 'Fondatore',
      worksFor: { '@id': 'https://silkincom.com/#organization' },
    },
    publisher: {
      '@type': 'Organization',
      name: 'SILKinCOM',
      logo: { '@type': 'ImageObject', url: `${APP_URL}/logo-official.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'article p'] },
    inLanguage: locale,
  };

  const howToConfig = HOWTO_POSTS[post.slug];
  const howToSchema = howToConfig
    ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: post.title,
        description: post.description,
        totalTime: howToConfig.totalTime,
        image: post.image ? [post.image.startsWith('http') ? post.image : `${APP_URL}${post.image}`] : undefined,
        inLanguage: locale,
        step: howToConfig.steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      }
    : null;
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${APP_URL}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: 'Trame di Como', item: `${APP_URL}${prefix}/trame-di-como` },
      { '@type': 'ListItem', position: 3, name: post.title, item: articleUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      )}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {post.image && (
          <Image src={post.image} alt={post.title} fill priority sizes="100vw" className="object-cover object-[center_32%] scale-105 animate-[heroZoom_20s_ease-out_forwards]" />
        )}
        {/* Bottom scrim carries the title; the image recedes into soft-black. */}
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/85 via-soft-black/25 to-transparent" />
        {/* Top scrim so the nav + gold wordmark stay legible over any hero image. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-soft-black/80 via-soft-black/30 to-transparent" />
        <div className="relative z-10 h-full flex items-end pb-20">
          <div className="max-w-[1100px] w-full mx-auto px-6 lg:px-10 text-warm-white animate-[fadeUp_1s_ease-out_forwards]">
            <span className="inline-block px-3 py-1 bg-warm-white/10 backdrop-blur-md text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-6 border border-warm-white/20">
              {t('eyebrow')}
              {post.date && ' • ' + new Date(post.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <h1 className="font-display font-light text-5xl md:text-6xl lg:text-8xl leading-[1.05] max-w-4xl drop-shadow-md">
              {post.title}
            </h1>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-warm-white relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-pearl-grey to-transparent" />
        <article className="max-w-3xl mx-auto px-6 prose prose-lg md:prose-xl font-light text-soft-black/85 leading-relaxed prose-headings:font-display prose-headings:font-light prose-headings:text-soft-black prose-p:text-soft-black/80 prose-a:text-gold-primary hover:prose-a:text-gold-dark">
          {/* Author byline — E-E-A-T signal for search and AI engines */}
          <div className="not-prose flex items-center justify-center gap-3 mb-12 text-[11px] uppercase tracking-[0.3em] text-soft-grey">
            <span>di</span>
            <Link href="/maison/marco-dibenedetto" className="text-gold-primary hover:text-gold-dark transition-colors font-medium">
              Marco Dibenedetto
            </Link>
            <span className="text-soft-grey/60">—</span>
            <span>Fondatore SILKinCOM</span>
          </div>
          {post.description && (
            <p className="font-display italic text-2xl md:text-3xl text-soft-black/90 mb-16 pb-12 border-b border-pearl-grey/50 text-center leading-relaxed">
              "{post.description}"
            </p>
          )}
          <div>
            {paragraphs.map((p, i) => {
              // Inline markdown-style headings inside the body so a single
              // editor-supplied paragraph can become a real <h2>/<h3>. This
              // lifts AI passage extraction (semantic anchors) and lets
              // search engines surface the structured hierarchy.
              if (p.startsWith('### ')) {
                return (
                  <h3 key={i} className="not-prose font-display font-light text-xl md:text-2xl mt-10 mb-4 text-soft-black">
                    {p.slice(4)}
                  </h3>
                );
              }
              if (p.startsWith('## ')) {
                return (
                  <h2 key={i} className="not-prose font-display font-light text-2xl md:text-3xl mt-14 mb-5 text-soft-black border-l-2 border-gold-primary pl-4">
                    {p.slice(3)}
                  </h2>
                );
              }
              const isFirst = i === 0;
              return (
                <p
                  key={i}
                  className={
                    isFirst
                      ? 'mb-8 first-letter:float-left first-letter:font-display first-letter:text-7xl first-letter:pr-4 first-letter:pt-2 first-letter:text-gold-primary first-letter:leading-[0.8] first-line:uppercase first-line:tracking-widest'
                      : 'mb-8'
                  }
                >
                  {renderInline(p)}
                </p>
              );
            })}
          </div>
          {CITATIONS[post.slug] && (
            <aside className="not-prose mt-16 pt-10 border-t border-pearl-grey/60">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gold-primary mb-4 font-medium">
                Fonti e approfondimenti
              </p>
              <ul className="text-sm text-soft-black/70 space-y-2 list-none pl-0">
                {CITATIONS[post.slug].map((c, i) => (
                  <li key={i}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-primary hover:text-gold-dark underline-offset-4 hover:underline transition-colors"
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      </section>

      {others.length > 0 && (
        <section className="py-24 bg-ivory border-t border-pearl-grey/30">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
              <h2 className="font-display font-light text-4xl md:text-5xl">{t('readMore')}</h2>
              <Link href="/trame-di-como" className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-soft-black hover:text-gold-primary transition-colors group">
                {t('viewAll')}
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {others.map((a) => (
                <Link key={a.slug} href={`/trame-di-como/${a.slug}`} className="group block h-full flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-beige-light mb-6">
                    {a.image && <Image src={a.image} alt={a.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-1000 group-hover:scale-110" />}
                    <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/10 transition-colors duration-500" />
                  </div>
                  <div className="flex flex-col flex-grow">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-gold-primary mb-3 block">
                      {a.date && new Date(a.date).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    </span>
                    <h3 className="font-display text-2xl font-light mb-3 group-hover:text-gold-primary transition-colors duration-300">{a.title}</h3>
                    <p className="text-sm text-soft-black/70 font-light line-clamp-2 mt-auto">{a.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
