import { getLocale } from 'next-intl/server';
import { getProducts } from '@/data/catalog';
import { BestsellerContent } from './Bestsellers';

export async function BestsellerSection() {
  const locale = await getLocale();
  const allProducts = await getProducts(locale);

  const featured = ['bellagio-2', 'cernobbio-azzurra', 'tremezzo-beige', 'melzi-1']
    .map((s) => allProducts.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const display = featured.length >= 2 ? featured : allProducts.slice(0, 4);

  return <BestsellerContent products={display} />;
}
