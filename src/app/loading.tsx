import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('common');

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border border-gold-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-[0.4em] text-soft-grey">
          {t('loading')}
        </span>
      </div>
    </div>
  );
}
