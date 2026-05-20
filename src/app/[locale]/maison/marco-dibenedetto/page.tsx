import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { localizedAlternates } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Marco Dibenedetto — Fondatore SILKinCOM',
    description:
      'Marco Dibenedetto, fondatore di SILKinCOM. Maison di seta e cashmere Made in Como. Storia, visione e ruolo nel distretto serico comasco.',
    alternates: localizedAlternates(locale, '/maison/marco-dibenedetto'),
  };
}

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${BASE_URL}/maison/marco-dibenedetto#person`,
  name: 'Marco Dibenedetto',
  jobTitle: 'Fondatore',
  worksFor: { '@id': `${BASE_URL}/#organization` },
  affiliation: { '@id': `${BASE_URL}/#organization` },
  url: `${BASE_URL}/maison/marco-dibenedetto`,
  nationality: { '@type': 'Country', name: 'Italia' },
  knowsAbout: [
    'Seta di Como',
    'Cashmere',
    'Made in Italy',
    'Tessile di lusso',
    'Distretto serico comasco',
    'Lavorazioni artigianali',
  ],
  description:
    'Imprenditore italiano. Fondatore di SILKinCOM, maison di accessori in seta e cashmere Made in Como. Opera nel distretto serico comasco con sede a Cermenate (CO).',
  homeLocation: { '@type': 'Place', name: 'Cermenate, Como, Italia' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Maison', item: `${BASE_URL}/maison/marco-dibenedetto` },
    { '@type': 'ListItem', position: 3, name: 'Marco Dibenedetto', item: `${BASE_URL}/maison/marco-dibenedetto` },
  ],
};

export default function MarcoDibenedettoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="pt-28 md:pt-44 pb-16 bg-ivory">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            La Maison
          </span>
          <h1 className="font-display font-light text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-soft-black mb-6">
            Marco Dibenedetto
          </h1>
          <p className="font-display italic text-xl md:text-2xl text-soft-black/80">
            Fondatore — SILKinCOM
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-warm-white">
        <div className="max-w-3xl mx-auto px-6 prose prose-lg font-light text-soft-black/85 leading-relaxed prose-headings:font-display prose-headings:font-light prose-headings:text-soft-black prose-a:text-gold-primary hover:prose-a:text-gold-dark">
          <p>
            Marco Dibenedetto fonda <strong>SILKinCOM</strong> nel distretto serico di Como con un'idea
            precisa: portare la seta, il cashmere e le altre fibre nobili lavorate sui telai
            comaschi direttamente a chi le indossa, senza i filtri delle grandi catene del lusso.
          </p>

          <h2>Il distretto come scuola</h2>
          <p>
            La sua formazione attraversa il tessuto manifatturiero che ha reso Como la capitale
            italiana della seta: i laboratori di stampa, le tessiture jacquard, gli atelier di
            orlatura a mano. Lo stesso ecosistema che da sei secoli rifornisce le grandi maison
            mondiali — Hermès, Ferragamo, Gucci — è il terreno su cui SILKinCOM costruisce la
            propria identità.
          </p>

          <h2>Visione</h2>
          <p>
            Un brand contemporaneo che si fonda interamente sul Made in Como: filatura, tintura,
            stampa, tessitura, confezione e finitura sono concentrate in pochi chilometri attorno
            al Lago. Niente fasi esternalizzate, niente compromessi sulle fibre — cashmere
            selezionato di Mongolia, seta di Como certificata, lino europeo, cotone extra-lungo,
            lana merino.
          </p>

          <h2>Ruolo nel distretto</h2>
          <p>
            Marco Dibenedetto opera dalla sede di Cermenate, in provincia di Como, dove si è
            sviluppata storicamente una densa rete di filande e laboratori artigianali. SILKinCOM
            si inserisce in questa filiera con il ruolo di Maison a contatto diretto con il
            cliente finale, mantenendo i rapporti con gli stessi artigiani che producono per il
            lusso internazionale.
          </p>

          <h2>Pubblicazioni e contributi</h2>
          <p>
            Marco firma le pagine editoriali del Journal SILKinCOM —{' '}
            <Link href="/trame-di-como/storia-della-seta-a-como">Storia della seta a Como</Link>,{' '}
            <Link href="/trame-di-como/come-riconoscere-seta-vera">Come riconoscere la seta vera</Link>,{' '}
            <Link href="/trame-di-como/cashmere-mongolo-vs-cinese">Cashmere mongolo o cinese</Link> — con
            l'intento di rendere accessibile la conoscenza tecnica che il distretto serico custodisce
            da generazioni.
          </p>

          <h2>Contatti</h2>
          <ul>
            <li>Email: <a href="mailto:info@silkincom.com">info@silkincom.com</a></li>
            <li>Sede operativa: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia</li>
            <li>P.IVA: IT03786790133</li>
          </ul>

          <p className="mt-12 text-center">
            <Link
              href="/la-nostra-storia"
              className="inline-block px-8 py-3 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-colors no-underline"
            >
              La nostra storia
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
