-- Strip the spec-sheet dump prefix from product descriptions.
--
-- description_long for the scarf / accessory products was a label dump —
-- "Composizione: ... Dimensioni: ... Finitura: orlo rifinito a mano ...
-- Prodotta interamente in Italia <editorial prose>" — followed by the real
-- editorial paragraph. The product page renders this verbatim in the
-- Description tab and feeds its first 80 chars (+ "…") into the short
-- "essence" line under the price, which cut mid-word ("orlo rifinito a ma…").
--
-- The spec part duplicates the `composition` and `dimensions` columns, so it
-- is dropped: everything up to and including the "... interamente in Italia"
-- boilerplate is removed, leaving only the editorial prose.
--
-- Italian source only — description_long_i18n is empty for every product, so
-- the admin "Traduci" action should be re-run afterwards to refill the 6
-- other locales from this cleaned source.
--
-- Idempotent: once cleaned, the row no longer starts with "Composizione:".

UPDATE products
SET description_long = regexp_replace(
  description_long,
  '^.*interamente in Italia( nel distretto tessile di Como)?\s+',
  ''
)
WHERE description_long ILIKE 'Composizione:%';
