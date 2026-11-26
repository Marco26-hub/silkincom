import { PROVENANCE_COPY, BRAND } from '@/data/brand';
import { normLocale } from '@/data/catalog-meta';

export function ProductProvenance({ locale }: { locale: string }) {
  const copy = PROVENANCE_COPY[normLocale(locale)];
  return (
    <section id="origine-e-filiera" className="bg-ivory px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-5 font-display text-3xl font-light">{copy.title}</h2>
        <p className="font-light leading-relaxed text-soft-black/80">{copy.body}</p>
        <a className="mt-5 inline-block text-sm text-gold-dark underline underline-offset-4" href={`mailto:${BRAND.email}`}>{copy.contact}</a>
      </div>
    </section>
  );
}
