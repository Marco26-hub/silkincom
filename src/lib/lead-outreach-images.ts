import { LEAD_OUTREACH_PRODUCT_SLUGS, type LeadOutreachProductImages } from "@/lib/lead-discovery";

type ProductImageRow = {
  image_url: string | null;
  is_primary: boolean | null;
  display_order: number | null;
};

type ProductRow = {
  slug: string;
  product_images?: ProductImageRow[] | null;
};

export async function loadLeadOutreachProductImages(
  supabase: any,
): Promise<LeadOutreachProductImages> {
  const { data, error } = await supabase
    .from("products")
    .select("slug, product_images(image_url, is_primary, display_order)")
    .in("slug", LEAD_OUTREACH_PRODUCT_SLUGS);

  if (error || !data) return {};

  return (data as ProductRow[]).reduce<LeadOutreachProductImages>(
    (imagesBySlug, product) => {
      const primaryImage = [...(product.product_images || [])]
        .filter((image) => Boolean(image.image_url))
        .sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return Number(a.display_order || 0) - Number(b.display_order || 0);
        })[0];

      if (primaryImage?.image_url) {
        imagesBySlug[product.slug] = primaryImage.image_url;
      }

      return imagesBySlug;
    },
    {},
  );
}
