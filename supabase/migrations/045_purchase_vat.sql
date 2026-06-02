-- Purchase-side cost accounting for the warehouse.
-- cost_price already exists (net purchase cost, € IVA esclusa) but was unused;
-- add the purchase VAT rate so the admin sees the gross landed cost and the
-- real margin against the (VAT-inclusive) sell price.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS purchase_vat_rate numeric NOT NULL DEFAULT 22;

COMMENT ON COLUMN products.cost_price IS 'Net purchase cost per unit (EUR, IVA esclusa).';
COMMENT ON COLUMN products.purchase_vat_rate IS 'Purchase VAT rate percent (default 22).';
