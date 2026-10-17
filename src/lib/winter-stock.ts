type StockItem = { product_id: string; product_slug: string; variant_id: string | null; quantity: number };
type Variant = { id: string; product_id: string };
type Inventory = { product_id: string; variant_id: string | null; quantity_available: number };

// Called before any order or payment creation. Aggregate duplicate cart rows
// so splitting a size across multiple lines cannot bypass its stock limit.
export function validateWinterStock(items: StockItem[], variants: Variant[], inventory: Inventory[]): string | null {
  const requested = new Map<string, number>();
  for (const item of items) {
    const variant = variants.find(v => v.id === item.variant_id && v.product_id === item.product_id);
    if (!variant) return `Seleziona una taglia valida per ${item.product_slug}.`;
    requested.set(variant.id, (requested.get(variant.id) ?? 0) + item.quantity);
  }
  for (const [variantId, quantity] of requested) {
    const stock = inventory.filter(row => row.variant_id === variantId);
    if (stock.length !== 1 || stock[0].quantity_available < quantity) return 'Quantità richiesta non disponibile. Aggiorna il carrello.';
  }
  return null;
}
