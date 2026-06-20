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
  const t = await getTranslations({ locale, namespace: 'pressPage' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates(locale, '/press'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  };
}

// Inline renderer mirroring the founder/blog body renderer so the press kit
// copy can live in messages and be translated like any other string.
// **bold** -> <strong>; [text](url) -> locale-aware <Link> for internal routes,
// plain <a> for http/mailto AND for static assets (paths with a file extension,
// e.g. /logo-official.svg) which must NOT get a locale prefix.
function isAsset(url: string): boolean {
  const seg = url.split('?')[0].split('#')[0];
  const last = seg.slice(seg.lastIndexOf('/') + 1);
  return last.includes('.');
}

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
      if (url.startsWith('/') && !isAsset(url)) {
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

// Premium press-kit renderer: group blocks under each "## " heading and render
// every section as a gold eyebrow (hairline + small-caps gold label) over its
// paragraphs / gold-bulleted lists — the editorial cadence used Maison-wide.
function RichBody({ body }: { body: string }) {
  const blocks = body.split('\n\n').filter(Boolean);
  const sections: { title: string; blocks: string[] }[] = [];
  for (const b of blocks) {
    if (b.startsWith('## ')) sections.push({ title: b.slice(3), blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(b);
    else sections.push({ title: '', blocks: [b] });
  }
  return (
    <div className="space-y-11 md:space-y-14 [&_a]:text-gold-dark [&_a]:underline [&_a]:decoration-gold-primary/40 [&_a]:underline-offset-4 hover:[&_a]:text-gold-primary [&_strong]:font-medium [&_strong]:text-soft-black">
      {sections.map((s, i) => (
        <section key={i}>
          {s.title && (
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-9 shrink-0 bg-gold-primary" />
              <h2 className="m-0 text-[11px] font-normal uppercase tracking-[0.4em] text-gold-dark">{s.title}</h2>
            </div>
          )}
          <div className="space-y-3.5">
            {s.blocks.map((b, j) => {
              const lines = b.split('\n');
              if (lines.every((l) => l.startsWith('- '))) {
                return (
                  <ul key={j} className="space-y-2.5">
                    {lines.map((l, k) => (
                      <li
                        key={k}
                        className="relative pl-5 font-light leading-[1.8] text-soft-black/80 before:absolute before:left-0 before:top-[0.72em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-gold-primary"
                      >
                        {renderInline(l.slice(2))}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={j} className="font-light leading-[1.95] text-soft-black/80">
                  {renderInline(b)}
                </p>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pressPage' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const pageUrl = `${APP_URL}${prefix}/press`;

  const pressSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: t('schemaName'),
    description: t('schemaDescription'),
    inLanguage: locale,
    about: { '@id': `${APP_URL}/#organization` },
    publisher: { '@id': `${APP_URL}/#organization` },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: nav('home'), item: `${APP_URL}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: t('eyebrow'), item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pressSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="relative overflow-hidden bg-soft-black pb-20 pt-32 text-warm-white md:pb-28 md:pt-44">
        <div className="absolute inset-x-6 top-20 h-px bg-gradient-to-r from-transparent via-gold-primary/50 to-transparent md:inset-x-16" />
        <div className="absolute -right-24 top-8 size-72 rounded-full border border-gold-primary/10 md:size-[30rem]" />
        <div className="relative mx-auto max-w-[900px] px-6 text-center lg:px-10">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('eyebrow')}
          </span>
          <h1 className="mb-6 font-display text-[3.25rem] font-light leading-[0.96] sm:text-6xl md:text-7xl lg:text-[6.5rem]">
            {t('h1')}
          </h1>
          <p className="font-display text-xl italic text-warm-white/70 md:text-2xl">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden border border-gold-primary/15 bg-warm-white px-7 py-12 shadow-[0_24px_80px_rgba(25,22,18,0.06)] md:px-14 md:py-16">
          {/* Thin gold rule across the top of the kit card — Maison accent. */}
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/60 to-transparent" />
          <RichBody body={t('body')} />
        </div>
      </section>
    </>
  );
}
