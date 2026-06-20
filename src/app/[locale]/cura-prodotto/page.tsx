import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('cura');
  return { title: t('title'), description: t('subtitle'), alternates: localizedAlternates(locale, '/cura-prodotto') };
}

export default async function CuraPage() {
  const t = await getTranslations('cura');
  const setaItems = t.raw('setaItems') as string[];
  const cashmereItems = t.raw('cashmereItems') as string[];
  const lanaItems = t.raw('lanaItems') as string[];
  const linoItems = t.raw('linoItems') as string[];
  const cotoneItems = t.raw('cotoneItems') as string[];

  return (
    <LegalPage title={t('title')} subtitle={t('subtitle')}>
      <h2>{t('seta')}</h2>
      <ul>{setaItems.map((i, k) => <li key={k}>{i}</li>)}</ul>

      <h2>{t('cashmere')}</h2>
      <ul>{cashmereItems.map((i, k) => <li key={k}>{i}</li>)}</ul>

      <h2>{t('lana')}</h2>
      <ul>{lanaItems.map((i, k) => <li key={k}>{i}</li>)}</ul>

      <h2>{t('lino')}</h2>
      <ul>{linoItems.map((i, k) => <li key={k}>{i}</li>)}</ul>

      <h2>{t('cotone')}</h2>
      <ul>{cotoneItems.map((i, k) => <li key={k}>{i}</li>)}</ul>

      <h2>{t('general')}</h2>
      <p>{t('generalBody')}</p>
    </LegalPage>
  );
}
