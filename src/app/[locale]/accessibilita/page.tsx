import { getLocale } from 'next-intl/server';
import { LegalPage } from '@/components/ui/LegalPage';
import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';

// Self-contained accessibility statement (EAA / WCAG 2.1 AA). Kept out of the
// shared messages/*.json to avoid touching all 7 locale files for a single
// legal page; Italian + English are provided, other locales fall back to English.

type Section = { h: string; body: string };
type Content = { title: string; subtitle: string; sections: Section[] };

const CONTACT = 'info@silkincom.com';
const UPDATED = '8 settembre 2026';

const CONTENT: Record<string, Content> = {
  it: {
    title: 'Dichiarazione di accessibilità',
    subtitle: 'Il nostro impegno per un sito utilizzabile da tutti.',
    sections: [
      {
        h: 'Il nostro impegno',
        body: `SILKinCOM si impegna a garantire l'accessibilità del proprio sito web al maggior numero possibile di persone, indipendentemente da tecnologia o abilità. Adottiamo come riferimento le linee guida <strong>WCAG 2.1 livello AA</strong> e ci allineiamo all'<strong>European Accessibility Act</strong> (Direttiva UE 2019/882, in vigore dal 28 giugno 2025).`,
      },
      {
        h: 'Stato di conformità',
        body: `Il sito è <strong>parzialmente conforme</strong> alle WCAG 2.1 AA: la maggior parte dei contenuti rispetta i criteri, ma alcune aree sono in fase di miglioramento continuo.`,
      },
      {
        h: 'Cosa abbiamo previsto',
        body: `<ul>
          <li>Struttura semantica con gerarchia dei titoli e attributo lingua della pagina.</li>
          <li>Testi alternativi sulle immagini di prodotto.</li>
          <li>Navigazione da tastiera e indicatori di focus visibili.</li>
          <li>Etichette esplicite sui campi dei moduli.</li>
          <li>Layout responsive, leggibile su mobile e con zoom fino al 200%.</li>
          <li>Attenzione al contrasto tra testo e sfondo.</li>
        </ul>`,
      },
      {
        h: 'Limitazioni note',
        body: `Alcuni componenti forniti da terze parti (ad esempio i moduli di pagamento) potrebbero non essere pienamente accessibili: stiamo lavorando con i fornitori per migliorarli. Se una parte del sito non ti risulta accessibile, contattaci e ti forniremo il contenuto o l'assistenza in forma alternativa.`,
      },
      {
        h: 'Segnalazioni e assistenza',
        body: `Se incontri difficoltà nell'uso del sito o vuoi richiedere un contenuto in formato accessibile, scrivici a <a href="mailto:${CONTACT}">${CONTACT}</a>. Ci impegniamo a rispondere entro pochi giorni lavorativi.`,
      },
      {
        h: 'Ultimo aggiornamento',
        body: `Questa dichiarazione è stata aggiornata il ${UPDATED}.`,
      },
    ],
  },
  en: {
    title: 'Accessibility statement',
    subtitle: 'Our commitment to a website usable by everyone.',
    sections: [
      {
        h: 'Our commitment',
        body: `SILKinCOM is committed to making its website accessible to as many people as possible, regardless of technology or ability. We follow the <strong>WCAG 2.1 level AA</strong> guidelines and align with the <strong>European Accessibility Act</strong> (EU Directive 2019/882, in force since 28 June 2025).`,
      },
      {
        h: 'Conformance status',
        body: `The site is <strong>partially conformant</strong> with WCAG 2.1 AA: most content meets the criteria, while some areas are under continuous improvement.`,
      },
      {
        h: 'What we have in place',
        body: `<ul>
          <li>Semantic structure with heading hierarchy and a page language attribute.</li>
          <li>Alternative text on product images.</li>
          <li>Keyboard navigation and visible focus indicators.</li>
          <li>Explicit labels on form fields.</li>
          <li>Responsive layout, readable on mobile and at up to 200% zoom.</li>
          <li>Care for text/background contrast.</li>
        </ul>`,
      },
      {
        h: 'Known limitations',
        body: `Some third-party components (for example payment modules) may not be fully accessible; we are working with our providers to improve them. If any part of the site is not accessible to you, contact us and we will provide the content or assistance in an alternative form.`,
      },
      {
        h: 'Feedback and assistance',
        body: `If you experience any difficulty using the site, or need content in an accessible format, email us at <a href="mailto:${CONTACT}">${CONTACT}</a>. We aim to reply within a few business days.`,
      },
      {
        h: 'Last updated',
        body: `This statement was last updated on 8 September 2026.`,
      },
    ],
  },
};

function pick(locale: string): Content {
  return CONTENT[locale] ?? CONTENT.en;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = pick(locale);
  return { title: c.title, description: c.subtitle, alternates: localizedAlternates(locale, '/accessibilita') };
}

export default async function AccessibilityPage() {
  const locale = await getLocale();
  const c = pick(locale);
  return (
    <LegalPage title={c.title} subtitle={c.subtitle}>
      {c.sections.map((s, i) => (
        <div key={i}>
          <h2>{s.h}</h2>
          <div dangerouslySetInnerHTML={{ __html: s.body }} />
        </div>
      ))}
    </LegalPage>
  );
}
