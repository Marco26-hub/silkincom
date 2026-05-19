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
