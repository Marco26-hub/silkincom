import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { POST_SLUGS, getPosts, getPost } from '@/data/posts';
import { localizedAlternates } from '@/i18n/routing';
import { ArrowUpRight } from 'lucide-react';

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

export function generateStaticParams() {
  return POST_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const p = getPost(slug, locale);
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
  const post = getPost(slug, locale);
  if (!post) notFound();

  const t = await getTranslations('journal');
  const paragraphs = post.body.split('\n\n').filter(Boolean);
  const others = getPosts(locale).filter((p) => p.slug !== post.slug).slice(0, 3);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';
  const articleUrl = `${baseUrl}/trame-di-como/${post.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image ? [post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`] : [],
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
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo-official.png` },
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
        image: post.image ? [post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`] : undefined,
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: 'Trame di Como', item: `${baseUrl}${prefix}/trame-di-como` },
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
          <Image src={post.image} alt={post.title} fill priority className="object-cover scale-105 animate-[heroZoom_20s_ease-out_forwards]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/80 via-soft-black/30 to-soft-black/10" />
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
          {post.description && (
            <p className="font-display italic text-2xl md:text-3xl text-soft-black/90 mb-16 pb-12 border-b border-pearl-grey/50 text-center leading-relaxed">
              "{post.description}"
            </p>
          )}
          <div className="first-letter:float-left first-letter:font-display first-letter:text-7xl first-letter:pr-4 first-letter:pt-2 first-letter:text-gold-primary first-letter:leading-[0.8] first-line:uppercase first-line:tracking-widest">
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-8">{p}</p>
            ))}
          </div>
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
