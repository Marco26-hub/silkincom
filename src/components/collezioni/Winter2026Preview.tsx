import Image from 'next/image';
import { Suspense } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { WinterCatalog, WinterCategoryNav } from '@/components/collezioni/WinterCatalog';
import { WinterPreviewSignup } from '@/components/collezioni/WinterPreviewSignup';
import { Link } from '@/i18n/navigation';
import type { Product } from '@/data/catalog';
import { normLocale } from '@/data/catalog-meta';
import { WINTER_COPY } from '@/data/winter-2026-copy';
import { WINTER_CATEGORY_COPY } from '@/data/winter-category-copy';
import { WINTER_PRODUCTS, WINTER_AVAILABILITY } from '@/data/winter-2026';
import { WINTER_VISUALS, WINTER_MACRO_ALT, winterPhotoClass } from '@/data/winter-2026-visuals';

type Props = {
  locale: string;
  products: Product[];
};

const products2026 = [
  {
    chapter: '01',
    slug: 'brunate',
    catalogSlug: WINTER_PRODUCTS[0].slug,
    name: 'Brunate',
    eyebrow: 'Il primo capitolo',
    headline: 'Il girocollo che illumina l’inverno.',
    material: '100% lana pregiata',
    description:
      'Un girocollo panna costruito a due fili, finezza 6. Calore naturale, mano piena e una linea pulita firmata dal Lago ricamato in blu.',
    facts: ['2 fili · finezza 6', 'Vestibilità regular', 'Taglie M—XL'],
    price: 145,
    hero: WINTER_VISUALS.brunate.cinematic,
    detail: WINTER_VISUALS.brunate.detail,
    tone: 'cream',
  },
  {
    chapter: '02',
    slug: 'menaggio',
    catalogSlug: WINTER_PRODUCTS[1].slug,
    name: 'Menaggio',
    eyebrow: 'Il secondo capitolo',
    headline: 'Leggero, caldo, immediato.',
    material: '100% cashmere',
    description:
      'Puro cashmere, costa morbida e risvolto avvolgente. Un accessorio essenziale con il profilo del Lago ricamato in blu e l’etichetta interna SILKinCOM.',
    facts: ['Puro cashmere', 'Risvolto a coste', 'Taglia unica'],
    price: 79,
    hero: WINTER_VISUALS.menaggio.cinematic,
    detail: WINTER_VISUALS.menaggio.detail,
    tone: 'grey',
  },
  {
    chapter: '03',
    slug: 'domaso',
    catalogSlug: WINTER_PRODUCTS[2].slug,
    name: 'Domaso',
    eyebrow: 'Il terzo capitolo',
    headline: 'Il comfort diventa stile.',
    material: '100% lana merino',
    description:
      'Una termica da 260 g/m² che regola il calore, respira e gestisce l’umidità. Il collo alto protegge; il nero mantiene la linea essenziale.',
    facts: ['260 g/m²', 'Termoregolante', 'Taglie S—XXL'],
    price: 119,
    hero: '/products/inverno-2026/final/dolcevita-uomo-lana-merino-nero-domaso-silkincom-02-indossato-lago-como.webp',
    detail: '/products/inverno-2026/final/dolcevita-uomo-lana-merino-nero-domaso-silkincom-03-ricamo-etichetta-interna.webp',
    tone: 'black',
  },
] as const;

const toneClasses = {
  cream: 'bg-[#e8dfcf] text-[#141311]',
  grey: 'bg-[#b5b8bd] text-[#111318]',
  black: 'bg-[#111318] text-[#f3eee4]',
};



export function Winter2026Preview({ locale, products }: Props) {
  const lang = normLocale(locale);
  const t = WINTER_COPY[lang];
  const categoryCopy = WINTER_CATEGORY_COPY[lang];
  const euro = new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' });
  return (
    <>
      <section className="relative overflow-hidden bg-[#0b0c0f] pt-28 text-[#f7f1e7] lg:min-h-[92svh] lg:pt-0">
        {/* Keep the portrait upright and top-aligned. A full-width landscape
            crop removed the model's head; the editorial column preserves it. */}
        <div className="relative mx-5 aspect-[4/5] max-h-[70svh] overflow-hidden sm:mx-8 lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:aspect-auto lg:max-h-none lg:w-[58%]">
          <Image
            src={WINTER_VISUALS.brunate.cinematic}
            alt={WINTER_PRODUCTS[0].content[lang].name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0c0f]/65 via-transparent to-transparent lg:bg-[linear-gradient(90deg,#0b0c0f_0%,rgba(7,8,11,0.25)_28%,transparent_65%)]" />
        </div>
        <div className="pointer-events-none absolute inset-4 border border-[#d3ad58]/25 sm:inset-7" />

        <div className="relative mx-auto flex max-w-[1500px] items-center px-7 pb-16 pt-10 sm:px-12 lg:min-h-[92svh] lg:px-16 lg:pb-24 lg:pt-36">
          <div className="max-w-[760px] lg:max-w-[48%]">
            <span className="mb-7 inline-flex border border-[#d3ad58]/50 bg-black/25 px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.42em] text-[#e4c06d] backdrop-blur-md">
              {t.kicker}
            </span>
            <h1 className="font-display text-[3.55rem] font-light leading-[0.95] tracking-[-0.045em] sm:text-7xl lg:text-[clamp(4rem,6.1vw,6.8rem)]">
              {t.title}
              <em className="mt-2 block font-light italic text-[#e4c06d]">{t.accent}</em>
            </h1>
            <p className="mt-8 max-w-xl text-sm font-light leading-[1.85] text-[#f7f1e7]/72 md:text-base">
              {t.intro}
            </p>
            <nav aria-label={categoryCopy.title} className="mt-7 flex flex-wrap gap-2">
              {(['abbigliamento', 'pashmine', 'sciarpe'] as const).map(area => (
                <Link key={area} href={`/collezioni/inverno/${area}`}
                  className="inline-flex min-h-11 items-center justify-center border border-[#d3ad58]/45 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-[#f7f1e7] transition-colors hover:border-[#d3ad58] hover:bg-[#d3ad58]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d3ad58]">
                  {categoryCopy.areas[area].name}
                </Link>
              ))}
            </nav>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <a
                href="#capsule-inverno-2026"
                className="inline-flex items-center gap-3 bg-[#d3ad58] px-7 py-4 text-[9px] font-semibold uppercase tracking-[0.32em] text-[#11100e] transition-colors hover:bg-[#f7f1e7]"
              >
                {t.discover} <ArrowDown className="h-3.5 w-3.5" />
              </a>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#f7f1e7]/65">
                {t.offer}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#f2ede4] px-6 pt-10 lg:px-10"><div className="mx-auto max-w-[1400px]"><WinterCategoryNav locale={locale} /></div></div>
      <section id="capsule-inverno-2026" className="scroll-mt-32 bg-[#f2ede4] pb-20 pt-10 text-[#151412] md:pb-28 md:pt-16">
        <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
          <div className="mb-14 grid gap-8 border-b border-black/15 pb-10 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <span className="mb-4 block text-[9px] font-semibold uppercase tracking-[0.44em] text-[#9a772e]">{t.title} · Vol. 01</span>
              <h2 className="font-display text-5xl font-light leading-[0.92] md:text-7xl">{t.chapters}<br /><em className="italic">{t.signature}</em></h2>
            </div>
            <p className="max-w-xl justify-self-end text-sm font-light leading-[1.9] text-black/65 md:text-base">
              {t.intro}
            </p>
          </div>

          <div className="space-y-8 md:space-y-12">
            {products2026.map((product, index) => (
              <article
                key={product.name}
                id={product.slug}
                className={`grid overflow-hidden lg:grid-cols-[1.08fr_0.92fr] ${toneClasses[product.tone]}`}
              >
                <div className={`relative aspect-[4/5] overflow-hidden lg:aspect-auto lg:min-h-[760px] ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Image
                    src={product.hero}
                    alt={WINTER_PRODUCTS[index].content[lang].name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
                  <span className="absolute left-7 top-7 font-display text-[8rem] leading-none text-white/20 md:left-10 md:top-9 md:text-[12rem]">{product.chapter}</span>
                  <div className="absolute inset-x-7 bottom-7 flex items-end justify-between gap-5 md:inset-x-10 md:bottom-10">
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.4em] text-[#e4c06d]">{product.chapter} / 03</span>
                      <h3 className="mt-2 font-display text-5xl font-light uppercase leading-none text-white md:text-7xl">{product.name}</h3>
                    </div>
                    <span className="hidden text-[9px] uppercase tracking-[0.3em] text-white/70 sm:block">Como · Italia</span>
                  </div>
                </div>

                <div className={`flex flex-col justify-between p-8 sm:p-12 lg:p-14 xl:p-16 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div>
                    {(() => {
                      const publishedProduct = products.find((item) => item.slug === product.catalogSlug);
                      const currentPrice = publishedProduct?.price ?? product.price;

                      return (
                        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-current/15 pb-7">
                          <div>
                            <span className="block text-[8px] font-semibold uppercase tracking-[0.32em] opacity-55">{t.price}</span>
                            <span className="mt-2 block font-display text-4xl font-light">{euro.format(currentPrice)}</span>
                          </div>
                        </div>
                      );
                    })()}
                    <span className="text-[9px] font-semibold uppercase tracking-[0.42em] text-[#9a772e]">{product.name} · {t.material}</span>
                    <p className="mt-5 font-display text-3xl font-light leading-[1.1] md:text-4xl">{WINTER_PRODUCTS[index].content[lang].composition}</p>
                    <h4 className="mt-10 max-w-md font-display text-4xl font-light leading-[0.98] md:text-5xl">{t.headlines[index]}</h4>
                    <p className="mt-7 max-w-lg text-sm font-light leading-[1.9] opacity-70 md:text-base">{WINTER_PRODUCTS[index].content[lang].short}</p>

                    <div className="mt-9 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      {[WINTER_PRODUCTS[index].content[lang].composition, WINTER_PRODUCTS[index].content[lang].dimensions].map((fact) => (
                        <span key={fact} className="border-t border-[#b68d39]/55 pt-3 text-[9px] font-semibold uppercase tracking-[0.22em]">{fact}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 grid grid-cols-[0.72fr_1fr] items-end gap-5">
                    <div className="relative aspect-[4/5] overflow-hidden border border-current/15">
                      <Image
                        src={product.detail}
                        alt={product.detail === WINTER_VISUALS.menaggio.detail ? WINTER_MACRO_ALT[lang] : `${WINTER_PRODUCTS[index].content[lang].name} · ${t.lake}`}
                        fill
                        sizes="240px"
                        className={winterPhotoClass(product.detail)}
                      />
                    </div>
                    <div className="pb-1">
                      <span className="mb-4 block h-px w-14 bg-[#b68d39]" />
                      <p className="font-display text-2xl font-light italic md:text-3xl">{t.lake}</p>
                      {product.slug === 'domaso' && !products.find((item) => item.slug === product.catalogSlug)?.variants.some((variant) => variant.available > 0) && (
                        <span className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#e4c06d]">{WINTER_AVAILABILITY.unavailable[lang]}</span>
                      )}
                      {products.some((item) => item.slug === product.catalogSlug) ? (
                        <Link
                          href={`/prodotto/${product.catalogSlug}`}
                          className="mt-5 inline-flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.3em] opacity-65 transition-opacity hover:opacity-100"
                        >
                          {products.find((item) => item.slug === product.catalogSlug)?.variants.some((variant) => variant.available > 0) ? t.buy : t.view} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <a
                          href={`?interesse=${product.slug}#anteprima-inverno`}
                          className="mt-5 inline-flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.3em] opacity-65 transition-opacity hover:opacity-100"
                        >
                          {t.notify} <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="anteprima-inverno" className="scroll-mt-24 bg-[#0c0d10] px-6 py-24 text-center text-[#f7f1e7] md:py-32">
        <div className="mx-auto max-w-3xl">
          <span className="text-[9px] font-semibold uppercase tracking-[0.48em] text-[#e4c06d]">{t.reserved}</span>
          <h2 className="mt-7 font-display text-5xl font-light leading-[0.95] md:text-7xl">{t.early}<br /><em className="italic text-[#e4c06d]">{t.earlyAccent}</em></h2>
          <p className="mx-auto mt-7 max-w-2xl text-sm font-light leading-[1.9] text-white/60 md:text-base">
            {t.conditions}
          </p>
          <Suspense fallback={null}><WinterPreviewSignup previewOnly={process.env.NODE_ENV === 'development' && process.env.WINTER_2026_LOCAL_PREVIEW === 'true'} /></Suspense>
        </div>
      </section>

      <WinterCatalog locale={locale} products={products} />
    </>
  );
}
