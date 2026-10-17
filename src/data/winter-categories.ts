import type { Product } from './catalog-meta';

export const WINTER_AREAS = ['sciarpe', 'pashmine', 'abbigliamento', 'cappellini'] as const;
export type WinterArea = typeof WINTER_AREAS[number];
export type WinterView = WinterArea | 'tutti';

export function isWinterView(value: string): value is WinterView {
  return value === 'tutti' || WINTER_AREAS.some(area => area === value);
}

export function getWinterArea(product: Pick<Product, 'category' | 'productType' | 'group'>): WinterArea | null {
  if (product.category === 'menaggio' || ['beanie', 'cap'].includes(product.productType ?? '') || product.category === 'darsena') return 'cappellini';
  if (product.category === 'bellagio' || product.productType === 'pashmina') return 'pashmine';
  if (['cernobbio', 'tremezzo', 'varenna'].includes(product.category) || product.productType === 'scarf') return 'sciarpe';
  if (['brunate', 'domaso'].includes(product.category) || product.group === 'abbigliamento') return 'abbigliamento';
  return null;
}

export function winterAreaProducts(products: Product[], area: WinterArea): Product[] {
  return products.filter(product => product.collections.includes('inverno') && getWinterArea(product) === area);
}
