import type { ReactEventHandler } from "react";
import imageVariants from "@/data/experience-images.json";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  onLoad?: ReactEventHandler<HTMLImageElement>;
};

/** Native srcset is needed because global Next image optimization is disabled. */
export function ExperienceImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  loading = "lazy",
  onLoad,
}: Props) {
  const variants = imageVariants[src as keyof typeof imageVariants];
  if (!variants) throw new Error(`Missing responsive Experience image: ${src}`);
  const srcSet = variants
    .map((variant) => `${variant.src} ${variant.width}w`)
    .join(", ");
  return (
    <>
      {priority && (
        <link
          rel="preload"
          as="image"
          imageSrcSet={srcSet}
          imageSizes={sizes}
          fetchPriority="high"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- Prebuilt responsive assets bypass the exhausted hosted optimizer quota. */}
      <img
        src={variants[variants.length - 1].src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={priority ? "eager" : loading}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        onLoad={onLoad}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </>
  );
}
