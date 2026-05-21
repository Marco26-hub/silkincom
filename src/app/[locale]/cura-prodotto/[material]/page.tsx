import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import { localizedAlternates } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';

const MATERIALS = ['seta', 'cashmere', 'lana', 'lino', 'cotone'] as const;
type Material = (typeof MATERIALS)[number];

// Per-material SEO copy. Italian only for the MVP; the next intl
// pass can lift these into messages/cura.{material}Intro.
const COPY: Record<Material, { title: string; intro: string }> = {
  seta: {
    title: 'Cura della seta: come lavare e conservare sciarpe e foulard',
    intro:
      'La seta è una fibra proteica delicata che richiede attenzione. Lavaggio a mano in acqua fredda o lavaggio a secco, mai centrifuga, asciugatura piatta lontano da fonti di calore. Una sciarpa o un foulard di seta ben curati accompagnano chi li porta per decenni.',
  },
  cashmere: {
    title: 'Cura del cashmere: lavaggio e conservazione di pashmine e sciarpe',
    intro:
      'Il cashmere è la fibra più nobile e fragile del guardaroba. Lavaggio a mano con sapone neutro o detergente specifico, asciugatura piatta, mai stiratura diretta. Con queste cure una pashmina o una sciarpa in cashmere conserva morbidezza e calore per molte stagioni.',
  },
  lana: {
    title: 'Cura della lana: come lavare e proteggere sciarpe e accessori',
    intro:
      'La lana merino, robusta ma traspirante, tollera lavaggi delicati in acqua tiepida con detergente neutro. Si asciuga distesa, lontano da luce diretta. Stiratura a vapore solo se necessaria, sempre con un panno protettivo interposto.',
  },
  lino: {
    title: 'Cura del lino: come lavare camicie, foulard e capi estivi',
    intro:
      'Il lino è una fibra resistente che migliora con l’uso. Tollera il lavaggio in lavatrice a bassa temperatura, ma l’asciugatrice è sconsigliata. Stiratura a caldo da umido per ridare il caratteristico finish liscio. La leggera stropicciatura è parte del fascino del lino.',
  },
  cotone: {
    title: 'Cura del cotone: come lavare t-shirt e accessori extra-lungo',
    intro:
      'Il cotone, in particolare quello extra-lungo che usiamo, è resistente e facile da curare. Lavaggio in lavatrice fino a 30 °C, asciugatura naturale, stiratura a media temperatura. Per i capi colorati, lavare al rovescio per preservare la stampa.',
  },
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
  const info = COPY[material as Material];
  return {
    title: info.title,
    // Trim to a clean word boundary — no trailing ellipsis.
    description:
      info.intro.length > 160
        ? info.intro.slice(0, 160).replace(/\s+\S*$/, '')
        : info.intro,
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
  const info = COPY[m];
  const t = await getTranslations('cura');
  const items = t.raw(`${m}Items`) as string[];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const pageUrl = `${baseUrl}${prefix}/cura-prodotto/${m}`;
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: info.title,
    description: info.intro,
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: 'Cura del prodotto', item: `${baseUrl}${prefix}/cura-prodotto` },
      { '@type': 'ListItem', position: 3, name: info.title, item: pageUrl },
    ],
  };

  return (
    <LegalPage title={info.title} subtitle={t('subtitle')}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <p>{info.intro}</p>

      <h2>I gesti essenziali</h2>
      <ul>
        {items.map((i, k) => (
          <li key={k}>{i}</li>
        ))}
      </ul>

      <h2>{t('general')}</h2>
      <p>{t('generalBody')}</p>

      <h2>Altri materiali</h2>
      <ul>
        {MATERIALS.filter((x) => x !== m).map((other) => (
          <li key={other}>
            <Link href={`/cura-prodotto/${other}`}>{COPY[other].title}</Link>
          </li>
        ))}
        <li>
          <Link href="/cura-prodotto">Torna alla cura del prodotto</Link>
        </li>
      </ul>
    </LegalPage>
  );
}
