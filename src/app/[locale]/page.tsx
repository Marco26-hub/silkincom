import { Hero } from '@/components/sections/Hero';
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

export async function generateMetadata() {
  const locale = await getLocale();
  return { alternates: localizedAlternates(locale, '') };
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
