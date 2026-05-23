-- Migration 032: reorder featured collections so Primavera/Estate comes first.
--
-- Prior order (display_order): inverno=1, iconica=2, primavera=3.
-- New order requested by the founder for the 22/05 audit:
--   Primavera/Estate → Inverno → Iconica
--
-- Loader (src/data/collections-db.ts:getFeaturedCollections) already sorts ASC
-- by display_order, so this single UPDATE propagates to:
--   - homepage <FeaturedCollections />
--   - /collezioni listing page
--   - /collezioni/[slug] cross-references
-- Cache tag `collections-meta` must be revalidated by the next admin write or
-- the next deploy.

UPDATE collections SET display_order = 1 WHERE slug = 'primavera';
UPDATE collections SET display_order = 2 WHERE slug = 'inverno';
UPDATE collections SET display_order = 3 WHERE slug = 'iconica';
