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

export async function generateMetadata() {
  const locale = await getLocale();
  return { alternates: localizedAlternates(locale, '') };
}

export default async function HomePage() {
  return (
    <>
      <Hero />
      <ValueProps />
      <FeaturedCollections />
      <BrandStory />
      <BestsellerSection />
      <Materials />
      <EditorialBanner />
      <InstagramFeed />
      <Newsletter />
    </>
  );
}
