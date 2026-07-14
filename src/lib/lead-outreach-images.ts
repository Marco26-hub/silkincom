import {
  LEAD_OUTREACH_FALLBACK_IMAGES,
  LEAD_OUTREACH_PRODUCT_IMAGE_ALIASES,
  LEAD_OUTREACH_PRODUCT_SLUGS,
  isMeaningfulLeadOutreachImage,
  resolveLeadOutreachImage,
  type LeadOutreachProductImages,
} from "@/lib/lead-discovery";

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
  const requestedSlugs = Array.from(
    new Set([
      ...LEAD_OUTREACH_PRODUCT_SLUGS,
      ...Object.values(LEAD_OUTREACH_PRODUCT_IMAGE_ALIASES).flat(),
    ]),
  );
  const { data, error } = await supabase
    .from("products")
    .select("slug, product_images(image_url, is_primary, display_order)")
    .in("slug", requestedSlugs);

  if (error) {
    throw new Error(`Catalogo immagini B2B non disponibile: ${error.message}`);
  }
  if (!data) {
    throw new Error("Catalogo immagini B2B senza risposta");
  }

  const imagesByCatalogSlug = (data as ProductRow[]).reduce<LeadOutreachProductImages>(
    (imagesBySlug, product) => {
      const primaryImage = [...(product.product_images || [])]
        .filter((image) => isMeaningfulLeadOutreachImage(image.image_url))
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

  return LEAD_OUTREACH_PRODUCT_SLUGS.reduce<LeadOutreachProductImages>(
    (imagesBySlug, slug) => {
      const aliasCandidates = LEAD_OUTREACH_PRODUCT_IMAGE_ALIASES[slug] || [];
      const resolvedImage = resolveLeadOutreachImage(
        imagesByCatalogSlug[slug],
        ...aliasCandidates.map((alias) => imagesByCatalogSlug[alias]),
        LEAD_OUTREACH_FALLBACK_IMAGES[slug],
      );

      if (resolvedImage) {
        imagesBySlug[slug] = resolvedImage;
      }

      return imagesBySlug;
    },
    {},
  );
}
