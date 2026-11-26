import { getLocale } from 'next-intl/server';
import { getProducts } from '@/data/catalog';
import MaterialiContent from './MaterialiContent';

export default async function MaterialiPage() {
  const locale = await getLocale();
  const products = await getProducts(locale);
  const prices = Object.fromEntries(products.map(product => [
    `/prodotto/${product.slug}`,
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(product.price),
  ]));
  return <MaterialiContent prices={prices} />;
}
