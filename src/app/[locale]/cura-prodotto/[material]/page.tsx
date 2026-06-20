import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { localizedAlternates } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { APP_URL } from '@/lib/app-url';

const MATERIALS = ['seta', 'cashmere', 'lana', 'lino', 'cotone'] as const;
type Material = (typeof MATERIALS)[number];

const CARE_UI: Record<string, { essentials: string; others: string; back: string }> = {
  it: { essentials: 'I gesti essenziali', others: 'Altri materiali', back: 'Torna alla cura del prodotto' },
  en: { essentials: 'Essential care steps', others: 'Other materials', back: 'Back to product care' },
  es: { essentials: 'Cuidados esenciales', others: 'Otros materiales', back: 'Volver al cuidado del producto' },
  fr: { essentials: 'Les gestes essentiels', others: 'Autres matières', back: 'Retour à l’entretien du produit' },
  de: { essentials: 'Die wichtigsten Pflegeschritte', others: 'Weitere Materialien', back: 'Zurück zur Produktpflege' },
  pt: { essentials: 'Cuidados essenciais', others: 'Outros materiais', back: 'Voltar aos cuidados do produto' },
  nl: { essentials: 'Essentiële verzorging', others: 'Andere materialen', back: 'Terug naar productverzorging' },
};

export function generateStaticParams() {
  return MATERIALS.map((m) => ({ material: m }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ material: string; locale: string }>;
}): Promise<Metadata> {
  const { material, locale } = await params;
  if (!(MATERIALS as readonly string[]).includes(material)) return {};
  const t = await getTranslations('cura');
  const materialName = t(material as Material);
  const items = t.raw(`${material}Items`) as string[];
  const title = `${materialName} — ${t('title')}`;
  const intro = items.slice(0, 2).join(' ');
  return {
    title,
    description:
      intro.length > 160
        ? intro.slice(0, 160).replace(/\s+\S*$/, '')
        : intro,
    alternates: localizedAlternates(locale, `/cura-prodotto/${material}`),
  };
}

export default async function CuraMaterialePage({
  params,
}: {
  params: Promise<{ material: string; locale: string }>;
}) {
  const { material, locale } = await params;
  if (!(MATERIALS as readonly string[]).includes(material)) notFound();
  const m = material as Material;
  const t = await getTranslations('cura');
  const items = t.raw(`${m}Items`) as string[];
  const materialName = t(m);
  const title = `${materialName} — ${t('title')}`;
  const intro = items.slice(0, 2).join(' ');
  const ui = CARE_UI[locale] ?? CARE_UI.en;

  const prefix = locale === 'it' ? '' : `/${locale}`;
  const pageUrl = `${APP_URL}${prefix}/cura-prodotto/${m}`;
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description: intro,
    inLanguage: locale,
    step: items.map((stepText, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: stepText,
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${APP_URL}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `${APP_URL}${prefix}/cura-prodotto` },
      { '@type': 'ListItem', position: 3, name: title, item: pageUrl },
    ],
  };

  return (
    <LegalPage title={title} subtitle={t('subtitle')}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <p>{intro}</p>

      <h2>{ui.essentials}</h2>
      <ul>
        {items.map((i, k) => (
          <li key={k}>{i}</li>
        ))}
      </ul>

      <h2>{t('general')}</h2>
      <p>{t('generalBody')}</p>

      <h2>{ui.others}</h2>
      <ul>
        {MATERIALS.filter((x) => x !== m).map((other) => (
          <li key={other}>
            <Link href={`/cura-prodotto/${other}`}>{`${t(other)} — ${t('title')}`}</Link>
          </li>
        ))}
        <li>
          <Link href="/cura-prodotto">{ui.back}</Link>
        </li>
      </ul>
    </LegalPage>
  );
}
