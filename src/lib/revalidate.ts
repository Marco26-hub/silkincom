import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * Invalidates catalog caches after an admin product mutation.
 * - revalidateTag('products') drops the unstable_cache data layer
 * - revalidatePath('/', 'layout') drops the full-route cache for every
 *   page that renders products (home, collections, product pages)
 */
export function revalidateCatalog() {
  revalidateTag('products');
  revalidatePath('/', 'layout');
}

/**
 * Invalidates home slides cache after admin mutations on home_slides.
 */
export function revalidateHomeSlides() {
  revalidateTag('home-slides');
  revalidatePath('/', 'layout');
}

/**
 * Invalidates Featured Collections cache after admin mutations on collections content.
 */
export function revalidateCollections() {
  revalidateTag('collections-meta');
  revalidatePath('/', 'layout');
}

/**
 * Invalidates the home_sections CMS cache (BrandStory / EditorialBanner /
 * InstagramFeed) after an admin mutation.
 */
export function revalidateHomeSections(sectionKey?: string) {
  revalidateTag('home-sections');
  if (sectionKey) revalidateTag(`home-section:${sectionKey}`);
  revalidatePath('/', 'layout');
}

/**
 * Invalidates the home-page Materials cards cache after an admin mutation
 * on the materials table content.
 */
export function revalidateHomeMaterials() {
  revalidateTag('home-materials');
  revalidatePath('/', 'layout');
}

/**
 * Invalidates the static_pages CMS cache (la-nostra-storia, atelier, b2b, ...)
 * after an admin mutation.
 */
export function revalidateStaticPages(pageKey?: string) {
  revalidateTag('static-pages');
  if (pageKey) revalidateTag(`static-page:${pageKey}`);
  revalidatePath('/', 'layout');
}
