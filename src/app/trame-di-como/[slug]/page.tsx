import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { POSTS, getPost } from '@/data/posts';
import { ArrowUpRight } from 'lucide-react';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description.slice(0, 160),
    openGraph: { images: p.image ? [p.image] : [] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const paragraphs = post.body.split('\n\n').filter(Boolean);
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app';
  const articleUrl = `${baseUrl}/trame-di-como/${post.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image ? [post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`] : [],
    datePublished: post.date || undefined,
    dateModified: post.date || undefined,
    author: { '@type': 'Organization', name: 'SILKinCOM', url: baseUrl },
    publisher: {
      '@type': 'Organization',
      name: 'SILKinCOM',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo-official.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    inLanguage: 'it-IT',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {post.image && (
          <Image src={post.image} alt={post.title} fill priority className="object-cover scale-105 animate-[heroZoom_20s_ease-out_forwards]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/80 via-soft-black/30 to-soft-black/10" />
        <div className="relative z-10 h-full flex items-end pb-20">
          <div className="max-w-[1100px] w-full mx-auto px-6 lg:px-10 text-warm-white animate-[fadeUp_1s_ease-out_forwards]">
            <span className="inline-block px-3 py-1 bg-warm-white/10 backdrop-blur-md text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-6 border border-warm-white/20">
              Journal
              {post.date && ' • ' + new Date(post.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
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
              <h2 className="font-display font-light text-4xl md:text-5xl">Continua a leggere</h2>
              <Link href="/trame-di-como" className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-soft-black hover:text-gold-primary transition-colors group">
                Vedi tutti gli articoli
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
                      {a.date && new Date(a.date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
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
