import { Hero } from '@/components/sections/Hero';
import { ShopStrip } from '@/components/sections/ShopStrip';
import { ValueProps } from '@/components/sections/ValueProps';
import { FeaturedCollections } from '@/components/sections/FeaturedCollections';
import { BrandStory } from '@/components/sections/BrandStory';
import { BestsellerSection } from '@/components/sections/BestsellersSectionLoader';
import { Materials } from '@/components/sections/Materials';
import { EditorialBanner } from '@/components/sections/EditorialBanner';
import { InstagramFeed } from '@/components/sections/InstagramFeed';
import { Newsletter } from '@/components/sections/Newsletter';
import { getLocale } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { getHomeSlides } from '@/data/home-slides';
import { getFeaturedCollections } from '@/data/collections-db';
import { getHomeSection, getHomeMaterials } from '@/data/home-content';

// Per-locale homepage title + description. Without these the page inherited the
// root layout's Italian default for EVERY locale, so a German/French/English
// buyer saw a fully Italian search snippet.
const HOME_META: Record<string, { title: string; description: string }> = {
  it: { title: 'SILKinCOM — Foulard, Sciarpe e Pashmine di Como in Seta e Cashmere', description: 'Foulard, sciarpe e pashmine in 100% seta e cashmere, Made in Como, dal distretto serico più antico d’Europa. Spedizione gratuita oltre €200.' },
  en: { title: 'SILKinCOM — Como Silk Foulards, Scarves & Cashmere Pashminas', description: 'Silk foulards, scarves and cashmere pashminas, Made in Como — Europe’s oldest silk district. Free shipping over €200.' },
  de: { title: 'SILKinCOM — Seidentücher, Schals & Kaschmir-Pashminas aus Como', description: 'Seidentücher, Schals und Kaschmir-Pashminas, Made in Como — das älteste Seidengebiet Europas. Kostenloser Versand ab €200.' },
  fr: { title: 'SILKinCOM — Foulards, Écharpes en Soie & Pashminas Cachemire de Côme', description: 'Foulards, écharpes en soie et pashminas en cachemire, Made in Como — le plus ancien district de la soie d’Europe. Livraison gratuite dès €200.' },
  es: { title: 'SILKinCOM — Pañuelos, Bufandas de Seda y Pashminas de Cachemir de Como', description: 'Pañuelos, bufandas de seda y pashminas de cachemir, Made in Como — el distrito de la seda más antiguo de Europa. Envío gratis desde €200.' },
  pt: { title: 'SILKinCOM — Lenços, Cachecóis de Seda e Pashminas de Caxemira de Como', description: 'Lenços, cachecóis de seda e pashminas de caxemira, Made in Como — o mais antigo distrito da seda da Europa. Portes grátis acima de €200.' },
  nl: { title: 'SILKinCOM — Zijden Sjaaltjes, Sjaals & Kasjmier Pashmina’s uit Como', description: 'Zijden sjaaltjes, sjaals en kasjmier pashmina’s, Made in Como — het oudste zijdedistrict van Europa. Gratis verzending vanaf €200.' },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const m = HOME_META[locale] ?? HOME_META.it;
  return {
    title: { absolute: m.title },
    description: m.description,
    alternates: localizedAlternates(locale, ''),
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  // Use allSettled so a single section loader failure (DB hiccup, RLS, stale
  // cache) degrades gracefully into a missing section instead of crashing
  // the whole homepage. Components already handle null inputs by falling
  // back to hard-coded copy.
  const results = await Promise.allSettled([
    getHomeSlides(locale),
    getFeaturedCollections(locale),
    getHomeSection('brand_story', locale),
    getHomeSection('editorial_banner', locale),
    getHomeSection('instagram_feed', locale),
    getHomeMaterials(locale),
    getHomeSection('value_props', locale),
  ]);
  const pick = <T,>(i: number, fallback: T): T => {
    const r = results[i];
    return r.status === 'fulfilled' ? (r.value as unknown as T) : fallback;
  };
  const slides = pick(0, []);
  const featured = pick(1, []);
  const brandStory = pick(2, null);
  const editorial = pick(3, null);
  const instagram = pick(4, null);
  const materials = pick(5, []);
  const valueProps = pick(6, null);
  return (
    <>
      <Hero slides={slides} />
      <ShopStrip />
      <ValueProps section={valueProps} />
      <FeaturedCollections collections={featured} />
      <BrandStory section={brandStory} />
      <BestsellerSection />
      <Materials materials={materials} />
      <EditorialBanner section={editorial} />
      <InstagramFeed section={instagram} />
      <Newsletter />
    </>
  );
}
