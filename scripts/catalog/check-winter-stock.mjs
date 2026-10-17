import assert from 'node:assert/strict';
import { validateWinterStock } from '../../src/lib/winter-stock.ts';

const variants = [{ id: 'm', product_id: 'brunate' }, { id: 'l', product_id: 'brunate' }, { id: 'uni', product_id: 'menaggio' }, { id: 'black', product_id: 'domaso' }];
const stock = variants.map(v => ({ product_id: v.product_id, variant_id: v.id, quantity_available: v.id === 'black' ? 0 : 3 }));
const item = (variant_id, quantity, product_id = 'brunate') => ({ product_id, product_slug: product_id, variant_id, quantity });
const cases = [
  ['exact available stock', [item('m', 3)], stock, true],
  ['separate sizes and one-size item', [item('m', 3), item('l', 3), item('uni', 3, 'menaggio')], stock, true],
  ['black item with zero stock', [item('black', 1, 'domaso')], stock, false],
  ['quantity above stock', [item('m', 4)], stock, false],
  ['duplicate cart rows cannot bypass limit', [item('m', 2), item('m', 2)], stock, false],
  ['missing size', [item(null, 1)], stock, false],
  ['size from another product', [item('uni', 1)], stock, false],
  ['missing inventory', [item('m', 1)], [], false],
  ['ambiguous inventory', [item('m', 1)], [...stock, stock[0]], false],
];
for (const [name, items, inventory, expected] of cases) {
  assert.equal(validateWinterStock(items, variants, inventory) === null, expected, name);
  console.log(`PASS: ${name}`);
}
console.log(`${cases.length} stock checks passed; no orders or payments created.`);
