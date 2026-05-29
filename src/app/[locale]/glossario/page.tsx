import { getLocale, getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { Link } from '@/i18n/navigation';
import { APP_URL } from '@/lib/app-url';

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: 'Glossario tessile — Termini della seta, cashmere e tessitura',
    description:
      'Definizioni precise dei termini tessili usati nel distretto serico di Como: rouletté, jacquard, twill, micron, GSM, mulinello. Glossario dalla Maison comasca.',
    alternates: localizedAlternates(locale, '/glossario'),
  };
}

type Term = {
  term: string;
  short: string;
  long: string;
};

const TERMS: Term[] = [
  {
    term: 'Seta di Como',
    short:
      'La seta lavorata nel distretto serico della provincia di Como, principale polo serico d\'Europa dal XV secolo.',
    long:
      'Con "seta di Como" si indica la seta lavorata nel distretto serico della provincia di Como, in Lombardia, il principale polo serico d\'Europa fin dal XV secolo, quando Ludovico Sforza promosse la coltivazione del gelso sulle colline lariane. Oggi il distretto comasco è l\'unica filiera dell\'emisfero occidentale in cui tutte le fasi — filatura, torcitura, tintura, stampa, tessitura e confezione — sono concentrate nel raggio di pochi chilometri. Vi hanno prodotto le maison del lusso mondiale (Hermès dagli anni Trenta, oltre a Gucci, Dior, Chanel) attraverso manifatture storiche come Mantero (1902) e Ratti (1945). SILKinCOM nasce in questo distretto e confeziona foulard, sciarpe e pashmine interamente a Como, dalla materia prima all\'orlo cucito a mano.',
  },
  {
    term: 'Rouletté (orlo cucito a mano)',
    short:
      'La rifinitura tradizionale del foulard di seta: il bordo viene arrotolato a mano con un punto invisibile.',
    long:
      'Tecnica di orlatura usata da generazioni nel distretto comasco. Il taglio del foulard viene arrotolato verso l\'interno e cucito a mano con piccoli punti che lo fissano senza appiattirlo. Crea un bordo morbido, leggermente in rilievo, riconoscibile al tatto. Una sciarpa di seta orlata a macchina ha un bordo piatto; una rouletté ha un bordo che "vive". È uno dei segni distintivi del foulard di alta gamma.',
  },
  {
    term: 'Jacquard',
    short: 'Tecnica di tessitura che intreccia disegni complessi direttamente nella struttura del tessuto.',
    long:
      'Inventato da Joseph-Marie Jacquard nel 1801, è il telaio che permette di intrecciare motivi figurati senza ricamarli sopra. Nel distretto di Como, Ratti è la dinastia storicamente associata al jacquard seta. Il disegno appare sia sul dritto sia sul rovescio (in negativo). Un jacquard di qualità ha trame fitte e un disegno nitido, anche su scale molto piccole.',
  },
  {
    term: 'Twill (saglia)',
    short: 'Armatura tessile in diagonale, leggera ma con buon corpo. È il tessuto standard del foulard di seta.',
    long:
      'Identificabile dalle linee diagonali sulla superficie del tessuto. Il twill di seta unisce leggerezza e drappeggio: il foulard scivola morbido, riprende la forma, sopporta l\'uso quotidiano senza stropicciarsi. Hermès ha reso celebre il "twill 90 cm" come standard del foulard quadrato.',
  },
  {
    term: 'Satin (raso)',
    short: 'Armatura che lascia in superficie lunghi filati di seta, creando lucentezza profonda.',
    long:
      'A differenza del twill, il satin ha pochi punti d\'incrocio: il filato emerge a lungo, riflette la luce in modo uniforme. È il tessuto della seta da abito, delle fodere di lusso, dei pareo. Più delicato del twill, richiede maggior cura nel lavaggio.',
  },
  {
    term: 'Mulinello',
    short:
      'Operazione di torsione del filo di seta prima della tessitura, decisiva per la mano del tessuto finale.',
    long:
      'Il filo viene torto su sé stesso per dare resistenza e corpo. Il numero di giri per metro (TPM) determina la mano: poca torsione = mano morbida e lucida; molta torsione = mano asciutta, opaca, più drappeggiante. La scelta del mulinello è una delle prime decisioni del tessitore.',
  },
  {
    term: 'Micron (μm)',
    short: 'Unità di misura del diametro di una fibra. Più basso il valore, più fine e pregiata la fibra.',
    long:
      'Un capello umano misura circa 75 μm. Il cashmere di alta qualità è sotto i 16 μm; il cashmere "baby" sotto i 14 μm; la seta è sotto i 12 μm. La merino fine è 17-19 μm, la merino superfine 16-17 μm, la merino extra-fine 15-16 μm. Sotto i 17 μm la lana smette di pungere la pelle.',
  },
  {
    term: 'GSM (grammi per metro quadro)',
    short: 'Peso del tessuto, indicatore di densità e quindi di morbidezza e caduta.',
    long:
      'Un foulard di seta leggero è 30-50 g/m²; un classico Hermès 70×70 è circa 90-100 g/m²; una pashmina di cashmere è 120-180 g/m²; una sciarpa di lana invernale può superare i 300 g/m². Il GSM non determina la qualità: una seta a 35 g/m² ben tessuta vale più di una pesante mal lavorata.',
  },
  {
    term: 'Denier',
    short:
      'Unità di misura della finezza del filato di seta (grammi per 9.000 metri di filo). Più basso = più fine.',
    long:
      'Un filo di seta cruda è tipicamente 20-22 denier; un filo di organzino fine è 12-14 denier. Sotto i 10 denier siamo nell\'altissima gamma. Il denier basso non basta da solo: serve un mulinello accurato e un\'armatura coerente per esprimere la finezza del filato.',
  },
  {
    term: 'Filato',
    short: 'Il filo ottenuto dalla lavorazione della materia prima (bozzolo di seta, pelo di cashmere, vello di lana).',
    long:
      'Prima fase della filiera tessile. Per la seta, il bozzolo viene immerso in acqua calda per ammorbidire il sericino e dipanato in un unico filo continuo che può raggiungere 1.000 metri. Per il cashmere, il sottopelo viene separato dal pelo grosso (descudo o dehairing) e poi cardato e pettinato.',
  },
  {
    term: 'Ordito e trama',
    short: 'I due insiemi di fili che si intrecciano sul telaio: l\'ordito longitudinale, la trama trasversale.',
    long:
      'L\'ordito è la base parallela tesa sul telaio prima della tessitura. La trama è il filo che attraversa l\'ordito da un lato all\'altro. Il rapporto fra densità di ordito e trama determina compattezza, peso, drappeggio del tessuto. Un foulard di seta tipico ha 40-60 fili/cm di ordito e altrettanti di trama.',
  },
  {
    term: 'Mongolia (cashmere)',
    short:
      'Il cashmere migliore proviene dalla Mongolia interna ed esterna, dove le capre Hyrcus producono il sottopelo più fine.',
    long:
      'Il freddo estremo dell\'altopiano mongolo (–40 °C in inverno) spinge la capra a sviluppare un sottopelo finissimo (12-15 μm). Il pelo viene raccolto a mano in primavera. Una capra produce 100-200 g di cashmere greggio l\'anno, da cui si ottengono 70-100 g di fibra pura dopo la cardatura. Tre capre = una sciarpa standard.',
  },
  {
    term: 'Twilly',
    short:
      'Stretta striscia di seta (100×8 cm circa) da legare al collo, al polso, alla borsa, ai capelli.',
    long:
      'Variante moderna del foulard, resa popolare da Hermès negli anni \'70. Il twilly classico è in twill di seta a 90 g/m². A differenza del foulard quadrato, si annoda in mille modi: cravattino, fascia, manico borsa, bracciale. Più versatile, più giovane, prezzo più accessibile.',
  },
  {
    term: 'Pashmina',
    short:
      'Stola larga (180×70 cm tipica) in cashmere finissimo proveniente dal Ladakh. Oggi spesso sinonimo di "stola grande in cashmere".',
    long:
      'Dal persiano pashm (lana). Originariamente indicava un tessuto specifico: il filato finissimo ricavato dal sottopelo delle capre Changthangi del Ladakh, tra India, Nepal e Tibet, oltre i 4.000 metri. Per estensione, oggi indica una stola larga in cashmere. Una pashmina autentica ha micronaggio 12-16 μm e peso di 100-150 g/m².',
  },
  {
    term: 'Foulard',
    short:
      'Termine francese (dal portoghese fula, "tessuto") per il quadrato di seta da collo (tipicamente 70×70 o 90×90 cm).',
    long:
      'Il foulard come accessorio nasce nel Settecento francese, ma diventa icona di stile con Hermès negli anni \'30 del Novecento. Il formato 90×90 cm con orlo rouletté è lo standard del lusso. Si annoda in decine di modi: ascot, parigino, boscaiolo, bandana, fascia per capelli, accessorio per borsa.',
  },
  {
    term: 'Iridescenza (seta)',
    short:
      'La proprietà della seta di riflettere la luce in modo cangiante, mostrando sfumature diverse a seconda dell\'angolo.',
    long:
      'Deriva dalla struttura triangolare della fibra di seta, che si comporta come un prisma. È il motivo per cui una seta autentica sembra cambiare colore con il movimento. Un poliestere o una viscosa hanno una lucentezza piatta e uniforme. È uno dei test più affidabili per riconoscere la seta vera.',
  },
  {
    term: 'Sericino e fibroina',
    short:
      'I due componenti del filo di seta: la fibroina (proteina strutturale) e il sericino (proteina collante).',
    long:
      'Il bozzolo del baco è formato da due fili di fibroina tenuti insieme dal sericino. Durante la lavorazione, il sericino viene parzialmente o totalmente rimosso (sgommatura), liberando la fibroina lucida. Una seta "in greggio" conserva ancora sericino e ha mano più ruvida; una seta "cotta" è completamente sgommata e ha la lucentezza tipica.',
  },
  {
    term: 'Seta di Como (marchio)',
    short:
      'Marchio collettivo che certifica origine e lavorazione della seta nel distretto serico comasco.',
    long:
      'Tutelato dalla Camera di Commercio di Como, garantisce che le fasi nobili della filiera (orditura, tessitura, stampa, finissaggio) avvengano nel territorio comasco. Non garantisce automaticamente che la seta greggia provenga dall\'Italia (la materia prima oggi è prevalentemente cinese o brasiliana), ma certifica la lavorazione locale.',
  },
  {
    term: 'Stampa a quadro (a telaio)',
    short:
      'Tecnica di stampa manuale o semi-meccanica che applica un colore alla volta tramite un telaio in seta.',
    long:
      'Per ogni colore del disegno serve un telaio (un quadro) separato. Un foulard Hermès classico richiede 30-50 quadri, applicati uno dopo l\'altro sul tessuto teso. Permette colori densi, brillanti, perfettamente registrati. È più lenta della stampa digitale ma resta lo standard del foulard di alta gamma.',
  },
  {
    term: 'Stampa digitale',
    short:
      'Stampa diretta del disegno sulla seta con stampante a getto d\'inchiostro per tessuti.',
    long:
      'Veloce, flessibile, permette numeri di colori illimitati e tirature corte. Per il foulard è oggi un\'alternativa valida alla stampa a quadro, soprattutto su disegni fotografici o ad alta risoluzione di sfumature. I colori sono leggermente meno densi rispetto al quadro tradizionale.',
  },
  {
    term: 'Finissaggio',
    short:
      'L\'insieme delle operazioni finali (sgommatura, tintura, vaporizzo, calandratura) che danno al tessuto la sua mano finale.',
    long:
      'Dopo la tessitura, il tessuto greggio passa attraverso bagni di sgommatura (rimozione del sericino), eventuale tintura, vaporizzo (fissaggio dei colori), calandratura (passaggio fra cilindri caldi che danno la mano definitiva). Un buon finissaggio fa la differenza fra una seta che vive bene nel tempo e una che ingiallisce, perde la mano o si stropiccia in modo irrecuperabile.',
  },
];

export default async function GlossarioPage() {
  const locale = await getLocale();
  const tn = await getTranslations('nav');

  // FAQPage schema using terms as Q/A — boosts AI citability and definition
  // extraction for question-shaped queries ("cos'è il rouletté?", "che cos'è
  // il twill?", "come si misura il micron del cashmere?").
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: TERMS.map((t) => ({
      '@type': 'Question',
      name: `Cos'è ${t.term.toLowerCase()}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: t.long,
      },
    })),
  };

  const definedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Glossario tessile SILKinCOM',
    inLanguage: locale,
    hasDefinedTerm: TERMS.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.long,
      inDefinedTermSet: `${APP_URL}/glossario`,
    })),
  };

  return (
    <>
      <BreadcrumbSchema trail={[{ name: 'Home', path: '/' }, { name: 'Glossario', path: '/glossario' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }} />

      <section className="pt-32 pb-16 bg-warm-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6">
            Riferimenti
          </span>
          <h1 className="font-display font-light text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6">
            Glossario <em className="italic text-gold-primary">tessile</em>
          </h1>
          <p className="text-lg font-light text-soft-black/80 leading-relaxed max-w-2xl mx-auto">
            I termini precisi della seta, del cashmere e del distretto comasco. Per leggere un&apos;etichetta, scegliere un foulard, riconoscere un tessuto autentico.
          </p>
        </div>
      </section>

      <section className="py-16 bg-warm-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          {/* Index */}
          <div className="border-y border-pearl-grey py-6 mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-4">Indice</p>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              {TERMS.map((t, i) => {
                const anchor = `term-${i}`;
                return (
                  <li key={anchor}>
                    <a href={`#${anchor}`} className="text-soft-black/80 hover:text-gold-primary transition-colors">
                      {t.term}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <dl className="space-y-12">
            {TERMS.map((t, i) => {
              const anchor = `term-${i}`;
              return (
                <article key={anchor} id={anchor} className="scroll-mt-32 group">
                  <dt className="font-display font-light text-2xl md:text-3xl text-soft-black mb-3 border-l-2 border-gold-primary pl-4 leading-tight">
                    {t.term}
                  </dt>
                  <dd className="text-base font-light text-soft-black/85 leading-[1.8] pl-4 border-l border-pearl-grey/0">
                    <p className="text-soft-black mb-3 font-normal">
                      {t.short}
                    </p>
                    <p className="text-soft-black/75">{t.long}</p>
                  </dd>
                </article>
              );
            })}
          </dl>

          <div className="mt-20 pt-10 border-t border-pearl-grey/60 text-center">
            <p className="text-sm font-light text-soft-grey mb-6">
              Vuoi approfondire la storia del distretto serico?
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/trame-di-como/storia-della-seta-a-como"
                className="inline-flex items-center gap-2 px-6 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-colors"
              >
                Storia della seta a Como
              </Link>
              <Link
                href="/materiali"
                className="inline-flex items-center gap-2 px-6 py-3 border border-soft-black text-soft-black text-[10px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-colors"
              >
                {tn('materials')}
              </Link>
              <Link
                href="/trame-di-como/come-riconoscere-seta-vera"
                className="inline-flex items-center gap-2 px-6 py-3 border border-soft-black text-soft-black text-[10px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-colors"
              >
                Come riconoscere la seta vera
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
