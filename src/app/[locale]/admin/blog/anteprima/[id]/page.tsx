import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Admin preview of a journal article in any language — drafts and scheduled
 * posts included, which the public /trame-di-como page hides. Lives under
 * /admin, so the admin layout already restricts it to admin roles.
 */

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anteprima articolo — Admin SILKinCOM', robots: { index: false } };

const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt', 'nl'] as const;
type Lang = (typeof LANGS)[number];

type Row = {
  id: string;
  slug: string;
  status: string;
  published_at: string | null;
  featured_image_url: string | null;
  title: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  title_i18n: Record<string, string> | null;
  excerpt_i18n: Record<string, string> | null;
  content_i18n: Record<string, string> | null;
  seo_title_i18n: Record<string, string> | null;
  seo_description_i18n: Record<string, string> | null;
};

// Same inline syntax as the public post page: [anchor](/path).
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={k++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-gold-primary underline underline-offset-4">
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// published_at is stored without timezone and means UTC.
function parseDbDate(s: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

export default async function AdminPostPreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang: rawLang } = await searchParams;
  const lang: Lang = (LANGS as readonly string[]).includes(rawLang ?? '') ? (rawLang as Lang) : 'it';

  const supabase = createServiceClient();
  const { data } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const p = data as Row;

  const pick = (base: string | null, i18n: Record<string, string> | null) =>
    lang === 'it' ? base ?? '' : (i18n && i18n[lang]) || '';
  const title = pick(p.title, p.title_i18n);
  const excerpt = pick(p.excerpt, p.excerpt_i18n);
  const body = pick(p.content, p.content_i18n);
  const seoTitle = pick(p.seo_title, p.seo_title_i18n);
  const seoDescription = pick(p.seo_description, p.seo_description_i18n);
  const missing = lang !== 'it' && !body;

  const date = p.published_at ? parseDbDate(p.published_at) : null;
  const scheduled = p.status === 'published' && date && date.getTime() > Date.now();
  const status = p.status !== 'published'
    ? { label: 'Bozza — non visibile sul sito', cls: 'bg-pearl-grey/40 text-soft-black' }
    : scheduled
      ? { label: `Programmato — esce ${date!.toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`, cls: 'bg-amber-100 text-amber-900' }
      : { label: 'Pubblicato — online', cls: 'bg-emerald-100 text-emerald-900' };

  return (
    <div className="max-w-[1100px] space-y-6">
      {/* Admin bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/blog" className="text-[11px] uppercase tracking-[0.2em] underline">← Torna al blog</Link>
        <span className={`px-3 py-1 text-[11px] uppercase tracking-[0.15em] ${status.cls}`}>{status.label}</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mr-2">Lingua</span>
        {LANGS.map((l) => {
          const has = l === 'it' || !!(p.content_i18n && p.content_i18n[l]);
          return (
            <Link
              key={l}
              href={`/admin/blog/anteprima/${p.id}?lang=${l}`}
              className={`px-2.5 py-1 text-[11px] uppercase tracking-wider border ${
                l === lang ? 'bg-soft-black text-warm-white border-soft-black'
                : has ? 'border-pearl-grey text-soft-black hover:border-soft-black'
                : 'border-pearl-grey text-soft-grey/50 line-through'}`}
            >
              {l}
            </Link>
          );
        })}
      </div>

      {/* How it appears on Google */}
      <div className="border border-pearl-grey bg-white px-5 py-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Come appare su Google</div>
        <div className="text-[#1a0dab] text-lg leading-snug">{seoTitle || title}</div>
        <div className="text-[#006621] text-xs">www.silkincom.com{lang === 'it' ? '' : `/${lang}`}/trame-di-como/{p.slug}</div>
        <div className="text-sm text-soft-black/70">{seoDescription || excerpt}</div>
      </div>

      {missing ? (
        <div className="border border-amber-200 bg-amber-50 px-5 py-8 text-sm text-amber-900">
          Questa lingua non è ancora tradotta. Apri l&apos;articolo e usa &quot;Traduci con AI&quot;.
        </div>
      ) : (
        <article className="bg-warm-white border border-pearl-grey">
          {p.featured_image_url && (
            <div className="relative h-[420px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.featured_image_url} alt="" className="w-full h-full object-cover object-[center_32%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-soft-black/85 via-soft-black/25 to-transparent" />
              <h1 className="absolute bottom-8 left-8 right-8 font-display font-light text-4xl md:text-5xl leading-[1.08] text-warm-white">{title}</h1>
            </div>
          )}
          <div className="max-w-3xl mx-auto px-6 py-12 text-soft-black/85 leading-relaxed">
            {!p.featured_image_url && <h1 className="font-display font-light text-4xl mb-8">{title}</h1>}
            {excerpt && (
              <p className="font-display italic text-2xl text-soft-black/90 mb-12 pb-10 border-b border-pearl-grey/50 text-center leading-relaxed">
                &ldquo;{excerpt}&rdquo;
              </p>
            )}
            {body.split('\n\n').filter(Boolean).map((block, i) => {
              if (block.startsWith('### ')) {
                return <h3 key={i} className="font-display font-light text-xl md:text-2xl mt-10 mb-4 text-soft-black">{block.slice(4)}</h3>;
              }
              if (block.startsWith('## ')) {
                return <h2 key={i} className="font-display font-light text-2xl md:text-3xl mt-14 mb-5 text-soft-black border-l-2 border-gold-primary pl-4">{block.slice(3)}</h2>;
              }
              return <p key={i} className="mb-6 text-[17px]">{renderInline(block)}</p>;
            })}
          </div>
        </article>
      )}
    </div>
  );
}
