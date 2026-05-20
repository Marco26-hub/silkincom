import type { Metadata } from 'next';
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
      'Marco Dibenedetto, fondatore di SILKinCOM. Formato all\'ITIS Setificio di Como (1998), opera nel distretto serico comasco con una visione direct-to-consumer del lusso italiano.',
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
  alumniOf: {
    '@type': 'EducationalOrganization',
    name: 'ITIS Setificio di Como (Istituto di Istruzione Superiore "Paolo Carcano")',
    description:
      'Storica scuola tessile fondata nel 1869 nel distretto serico di Como, formazione tecnica in chimica tessile, tessitura, stampa e finissaggio.',
  },
  knowsAbout: [
    'Seta di Como',
    'Cashmere',
    'Made in Italy',
    'Tessile di lusso',
    'Distretto serico comasco',
    'Chimica tessile',
    'Tessitura jacquard',
    'Stampa serigrafica',
    'Orlatura rouletté',
    'Finissaggio tessile',
  ],
  description:
    'Imprenditore italiano, fondatore di SILKinCOM. Diplomato nel 1998 all\'ITIS Setificio di Como — scuola tessile attiva dal 1869 nel distretto serico comasco. Opera dalla sede di Cermenate con un modello direct-to-consumer per il lusso tessile Made in Como.',
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
        <article className="max-w-3xl mx-auto px-6 prose prose-lg font-light text-soft-black/85 leading-relaxed prose-headings:font-display prose-headings:font-light prose-headings:text-soft-black prose-headings:mt-14 prose-headings:mb-5 prose-a:text-gold-primary hover:prose-a:text-gold-dark prose-p:leading-[1.85]">

          <p className="text-xl font-display italic text-soft-black/90 mb-12 pb-10 border-b border-pearl-grey/50 text-center">
            &ldquo;Il distretto comasco produce per il lusso mondiale ai massimi livelli tecnici da quasi un secolo. SILKinCOM porta questa qualità direttamente a chi la indossa, senza la mediazione delle grandi catene.&rdquo;
          </p>

          <p>
            <strong>Marco Dibenedetto</strong> è il fondatore di SILKinCOM, la Maison italiana di accessori
            in seta, cashmere e fibre naturali nata sul Lago di Como per portare il distretto serico più
            importante d&apos;Europa direttamente a chi indossa le sue creazioni. Una premessa semplice,
            ma poco frequente nel lusso contemporaneo: l&apos;idea che la qualità tecnica del tessuto
            comasco — la stessa che da decenni rifornisce le più importanti maison del lusso internazionale
            — possa essere offerta senza il filtro delle grandi catene, attraverso un rapporto diretto fra
            Maison e cliente.
          </p>

          <h2>Le origini, al Setificio</h2>
          <p>
            Marco si forma all&apos;<strong>ITIS Setificio di Como</strong>, dove consegue il diploma
            tessile nel <strong>1998</strong>. Il Setificio, attivo dal 1869, è la scuola tecnica che il
            distretto serico stesso ha costruito per trasmettere il proprio sapere alle generazioni
            successive: da qui sono usciti i tecnici, i chimici tessili, gli stampatori e i tessitori
            che hanno alimentato le manifatture comasche per oltre un secolo e mezzo. È qui che Marco
            impara la grammatica del tessuto: armature, filati, mulinello, chimica della seta, stampa,
            finissaggio. Una formazione tecnica rigorosa, calibrata sulla realtà del territorio.
          </p>

          <h2>Il distretto come scuola</h2>
          <p>
            La formazione si completa fuori dall&apos;aula. Negli anni successivi al diploma Marco
            attraversa il tessuto manifatturiero comasco confrontandosi direttamente con chi lavora le
            fibre: tessitori jacquard, stampatori a quadro, orlatori che cuciono a mano il rouletté del
            foulard, tintori, finissatori. La pratica del distretto è in larga parte tacita — si
            trasmette nel laboratorio, davanti al telaio, accanto al banco di stampa. È un sapere che il
            Setificio fornisce in forma sistematica e che gli artigiani trasferiscono nella sua
            dimensione concreta, gesto per gesto. Da questo intreccio fra scuola tecnica e bottega nasce
            la rete di interlocutori artigiani che diventerà, anni più tardi, la base produttiva di
            SILKinCOM.
          </p>

          <h2>La scelta direct-to-consumer</h2>
          <p>
            SILKinCOM nasce da una constatazione semplice: il distretto comasco produce per il lusso
            mondiale a livelli tecnici altissimi, ma la maggior parte di questo lavoro finisce sotto
            firma di terzi che applicano margini multipli al costo di produzione. Il cliente paga,
            infine, due o tre volte il valore intrinseco del prodotto — una porzione minore va
            all&apos;artigiano, una porzione maggiore va al marchio che firma. Marco progetta SILKinCOM
            esplicitamente come reazione a questo schema: una Maison italiana che lavora con gli stessi
            telai e gli stessi artigiani del lusso internazionale, ma vende direttamente al cliente
            finale, senza intermediari.
          </p>

          <h2>La visione</h2>
          <p>
            Il Made in Como, per SILKinCOM, non è una claim di marketing: è una regola operativa
            stretta. Filatura, tintura, stampa, tessitura, confezione e finitura avvengono tutte nel
            raggio di pochi chilometri da Como. Nessuna fase è esternalizzata fuori dal distretto. Le
            fibre sono selezionate caso per caso — cashmere mongolo con micronaggio sotto i 15,5 micron,
            seta di Como certificata, lino europeo, cotone extra-lungo (fibra superiore a 35 mm), lana
            merino superfine. La trasparenza sulle fonti è parte integrante del prodotto: ogni materiale
            ha una pagina dedicata che spiega origine, caratteristiche tecniche e cura.
          </p>

          <h2>Il processo</h2>
          <p>
            Una sciarpa SILKinCOM nasce da un dialogo fra designer e tessitore. Marco lavora a stretto
            contatto con gli atelier comaschi nella scelta delle armature (twill, satin, jacquard),
            nella definizione delle densità di ordito e trama, nella selezione delle palette cromatiche.
            La stampa — sui foulard di seta — passa attraverso atelier specializzati del distretto.
            L&apos;orlatura del foulard è cucita a mano: ogni rouletté richiede tra i 90 e i 180 minuti
            di lavoro di un&apos;unica artigiana esperta. È il dettaglio che separa un foulard di alta
            gamma da un accessorio industriale, e che il cliente riconosce al tatto prima ancora che alla
            vista.
          </p>

          <h2>Le persone</h2>
          <p>
            SILKinCOM non è un brand monolitico: è una rete di laboratori indipendenti, coordinata da
            Marco e dalla sua sede operativa di Cermenate. Tre artigiani in particolare collaborano
            stabilmente con la Maison: <strong>Paolo</strong>, maestro tessitore — segue il telaio
            jacquard; <strong>Adriano</strong>, maestro stampatore — prepara i quadri e mescola gli
            inchiostri di stampa; <strong>Roberta</strong>, orlatrice rouletté — cuce a mano il bordo
            di ogni foulard di seta. Marco firma personalmente la selezione del progetto, ma il
            prodotto finale è il risultato di un lavoro condiviso che riflette la natura distrettuale
            dell&apos;industria serica comasca. I loro volti e le loro voci sono raccolti nella pagina{' '}
            <Link href="/artigiani">Artigiani</Link>.
          </p>

          <h2>Continuità e responsabilità</h2>
          <p>
            SILKinCOM si inserisce in una storia che attraversa sei secoli: dai primi gelsi piantati
            sulle colline lariane nel Quattrocento, alle filande del Settecento, alle dinastie tessili
            del Novecento, fino al distretto contemporaneo. La Maison ha la responsabilità di mantenere
            viva una filiera che la globalizzazione degli anni Novanta ha indebolito, ma non spento. La
            scelta direct-to-consumer è anche, in questo senso, una scelta industriale: dare ai
            laboratori comaschi un&apos;alternativa al lavoro per conto terzi, che possa sostenerli nei
            prossimi decenni. Il racconto esteso è disponibile in{' '}
            <Link href="/trame-di-como/storia-della-seta-a-como">Storia della seta a Como</Link>.
          </p>

          <h2>Pubblicazioni</h2>
          <p>
            Marco firma le pagine editoriali del Journal SILKinCOM —{' '}
            <Link href="/trame-di-como/storia-della-seta-a-como">Storia della seta a Como</Link>,{' '}
            <Link href="/trame-di-como/come-riconoscere-seta-vera">Come riconoscere la seta vera</Link>,{' '}
            <Link href="/trame-di-como/cashmere-mongolo-vs-cinese">Cashmere mongolo o cinese</Link>,{' '}
            <Link href="/trame-di-como/pashmina-vs-sciarpa-differenze">Pashmina e sciarpa: differenze</Link>{' '}
            — con l&apos;intento di rendere accessibile al cliente finale la conoscenza tecnica che il
            distretto serico custodisce da generazioni.
          </p>

          <h2>Contatti</h2>
          <ul>
            <li>Email: <a href="mailto:info@silkincom.com">info@silkincom.com</a></li>
            <li>Sede operativa: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia</li>
            <li>P.IVA: IT03786790133</li>
          </ul>

          <p className="mt-12 text-center not-prose">
            <Link
              href="/la-nostra-storia"
              className="inline-block px-8 py-3 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-colors no-underline"
            >
              La nostra storia
            </Link>
          </p>
        </article>
      </section>
    </>
  );
}
