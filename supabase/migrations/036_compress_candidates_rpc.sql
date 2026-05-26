-- Helper RPC for the compress-product-images Edge Function. Returns the next
-- batch of large product-image storage objects so the function doesn't need
-- to reach into the `storage` schema from the JS client (where the schema
-- prefix call wasn't returning rows under the service role).
CREATE OR REPLACE FUNCTION public.compress_candidates(min_bytes BIGINT, lim INT)
RETURNS TABLE(object_name TEXT, size_bytes BIGINT, image_id UUID, image_url TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    o.name AS object_name,
    ((o.metadata->>'size')::bigint) AS size_bytes,
    pi.id AS image_id,
    pi.image_url
  FROM storage.objects o
  LEFT JOIN public.product_images pi
    ON pi.image_url LIKE '%/' || o.name
  WHERE o.bucket_id = 'product-images'
    AND ((o.metadata->>'size')::bigint) > min_bytes
  ORDER BY ((o.metadata->>'size')::bigint) DESC
  LIMIT lim;
$$;

CREATE OR REPLACE FUNCTION public.compress_remaining(min_bytes BIGINT)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COUNT(*)
  FROM storage.objects o
  WHERE o.bucket_id = 'product-images'
    AND ((o.metadata->>'size')::bigint) > min_bytes;
$$;
