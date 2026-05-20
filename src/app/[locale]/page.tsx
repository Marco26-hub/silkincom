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
  const [slides, featured, brandStory, editorial, instagram, materials] = await Promise.all([
    getHomeSlides(locale),
    getFeaturedCollections(locale),
    getHomeSection('brand_story', locale),
    getHomeSection('editorial_banner', locale),
    getHomeSection('instagram_feed', locale),
    getHomeMaterials(locale),
  ]);
  return (
    <>
      <Hero slides={slides} />
      <ValueProps />
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
