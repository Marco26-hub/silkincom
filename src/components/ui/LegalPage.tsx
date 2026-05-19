import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

export async function LegalPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const t = await getTranslations('common');
  return (
    <>
      <section className="pt-40 pb-12 bg-ivory">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">{t('information')}</span>
          <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl">{title}</h1>
          {subtitle && <p className="mt-6 text-sm text-soft-grey">{subtitle}</p>}
        </div>
      </section>
      <section className="py-16 md:py-24 bg-warm-white">
        <div className="max-w-3xl mx-auto px-6 legal-content text-soft-black/85">
          {children}
        </div>
      </section>
    </>
  );
}
