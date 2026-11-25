// Editorial proposals to quote with operators; no confirmed inventory, prices or availability.
export const EXPERIENCE_CATEGORIES = [
  {
    id: "selection",
    label: "La selezione",
    description: "Esperienze scelte per conoscere il carattere del lago.",
  },
  {
    id: "lake",
    label: "Acqua e meraviglie",
    description:
      "Navigazione, dimore storiche e luoghi da osservare da una prospettiva diversa.",
  },
  {
    id: "taste",
    label: "Gusto e territorio",
    description:
      "Ristoranti, produttori e cucina: incontri che raccontano i luoghi attraverso i sapori.",
  },
  {
    id: "silk",
    label: "Como Silk Experience",
    description:
      "Un unico percorso nella seta di Como: lavorazioni, colore e appuntamenti in showroom.",
  },
  {
    id: "city",
    label: "Arte, moda e città",
    description:
      "Una parentesi urbana tra cultura, shopping e indirizzi da scoprire.",
  },
  {
    id: "active",
    label: "Golf e tempo per sé",
    description:
      "Sport, natura e benessere, con attività adeguate alla preparazione degli ospiti.",
  },
] as const;
export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number]["id"];
export type ExperienceLake = "como" | "maggiore";
type Experience = {
  id: string;
  lakes: readonly ExperienceLake[];
  category: Exclude<ExperienceCategory, "selection">;
  title: string;
  location: string;
  summary: string;
  description: string;
  detail: string;
  duration: string;
  format: string;
  icon: string;
  featured?: boolean;
};
export const EXPERIENCES: readonly Experience[] = [
  {
    id: "orrido-bellano",
    lakes: ["como"],
    category: "lake",
    title: "Orrido di Bellano",
    location: "Bellano · Lago di Como",
    summary: "Scopra un suggestivo orrido e il suo territorio, con un itinerario da personalizzare.",
    description: "Acqua, roccia e paesaggi del lago: una proposta da costruire attorno all’orrido e ai luoghi vicini, secondo i suoi interessi.",
    detail: "Percorso, accompagnamento, eventuali ingressi e trasferimenti sono da concordare. Accessibilità, condizioni meteo e aperture devono essere verificati prima della visita.",
    duration: "2–3 ore",
    format: "Itinerario con guida",
    icon: "mountain",
  },
  {
    id: "orrido-faggeto",
    lakes: ["como"],
    category: "lake",
    title: "Orrido di Faggeto",
    location: "Faggeto Lario · Lago di Como",
    summary: "Scopra un suggestivo orrido e il suo territorio, con un itinerario da personalizzare.",
    description: "Acqua, roccia e paesaggi del lago: una proposta da costruire attorno all’orrido e ai luoghi vicini, secondo i suoi interessi.",
    detail: "Percorso, accompagnamento, eventuali ingressi e trasferimenti sono da concordare. Accessibilità, condizioni meteo e aperture devono essere verificati prima della visita.",
    duration: "2–3 ore",
    format: "Itinerario con guida",
    icon: "mountain",
  },
  {
    id: "orrido-nesso",
    lakes: ["como"],
    category: "lake",
    title: "Orrido di Nesso",
    location: "Nesso · Lago di Como",
    summary: "Scopra un suggestivo orrido e il suo territorio, con un itinerario da personalizzare.",
    description: "Acqua, roccia e paesaggi del lago: una proposta da costruire attorno all’orrido e ai luoghi vicini, secondo i suoi interessi.",
    detail: "Percorso, accompagnamento, eventuali ingressi e trasferimenti sono da concordare. Accessibilità, condizioni meteo e aperture devono essere verificati prima della visita.",
    duration: "2–3 ore",
    format: "Itinerario con guida",
    icon: "mountain",
  },
  {
    id: "orrido-santanna",
    lakes: ["maggiore"],
    category: "lake",
    title: "Orrido di Sant’Anna",
    location: "Cannobio · Lago Maggiore",
    summary: "Scopra un suggestivo orrido e il suo territorio, con un itinerario da personalizzare.",
    description: "Acqua, roccia e paesaggi del lago: una proposta da costruire attorno all’orrido e ai luoghi vicini, secondo i suoi interessi.",
    detail: "Percorso, accompagnamento, eventuali ingressi e trasferimenti sono da concordare. Accessibilità, condizioni meteo e aperture devono essere verificati prima della visita.",
    duration: "2–3 ore",
    format: "Itinerario con guida",
    icon: "mountain",
  },
  {
    id: "boat",
    duration: "2–4 ore",
    format: "In autonomia o con capitano",
    lakes: ["como", "maggiore"],
    category: "lake",
    title: "Il lago, dalla barca",
    location: "Lago di Como · Lago Maggiore",
    icon: "ship",
    featured: true,
    summary: "Scopra ville e borghi dall’acqua. Scelga la libertà di guidare o il piacere di affidarsi a un capitano.",
    description:
      "Il lago da una prospettiva speciale: ville affacciate sull’acqua, piccoli approdi e borghi da scoprire. Un’uscita in autonomia, con capitano o con aperitivo a bordo, seguendo il ritmo del suo soggiorno.",
    detail:
      "Le formule nautiche sono presentate nella sezione dedicata. Imbarcazione, personale a bordo, durata, punto di partenza e servizi vengono definiti nel preventivo dell’operatore.",
  },
  {
    id: "villas",
    duration: "2–3 ore",
    format: "Visita con guida da concordare",
    lakes: ["como"],
    category: "lake",
    title: "Le ville del Lago di Como",
    location: "Tremezzina · Bellagio · Varenna",
    icon: "landmark",
    featured: true,
    summary: "Passeggi tra giardini affacciati sul Lario e dimore storiche, accompagnato da una guida.",
    description:
      "Giardini sul lago, sale ricche di storia e scorci da ricordare. Una visita accompagnata a Villa del Balbianello, Villa Carlotta, Villa Melzi o Villa Monastero, scegliendo le tappe più adatte al suo viaggio.",
    detail:
      "Visite, guida e ingressi si concordano secondo il calendario delle singole ville. L’arrivo in barca non comprende automaticamente l’ingresso; non sono promessi accessi riservati o prioritari.",
  },
  {
    id: "brunate",
    duration: "3–4 ore",
    format: "Passeggiata con guida",
    lakes: ["como"],
    category: "lake",
    title: "Como e la funicolare di Brunate",
    location: "Como · Brunate",
    icon: "mountain",
    featured: true,
    summary: "Visiti il centro di Como e salga in funicolare verso Brunate, per ammirare il lago dall’alto.",
    description:
      "Dalle piazze di Como al panorama di Brunate: una visita in città e, quando il servizio è attivo, la salita in funicolare. In cima, il tempo per una passeggiata e una sosta con vista.",
    detail:
      "La funicolare viene inserita nel programma quando il servizio è attivo. La passeggiata e l’eventuale salita al Faro Voltiano richiedono tempi e preparazione distinti; non sono compresi automaticamente.",
  },
  {
    id: "villages",
    duration: "2–3 ore",
    format: "Itinerario con guida",
    lakes: ["como", "maggiore"],
    category: "lake",
    title: "Borghi e passeggiate sul lago",
    location: "Località da scegliere sul lago del soggiorno",
    icon: "compass",
    summary: "Si lasci guidare tra vicoli, botteghe e lungolago, con soste nei borghi del lago scelto.",
    description:
      "Vicoli, botteghe e passeggiate sull’acqua. Bellagio o Varenna sul Lago di Como, Stresa e i borghi del Verbano sul Maggiore: una visita accompagnata, con il tempo per fermarsi e assaporare ogni luogo.",
    detail:
      "Le località sono alternative da comporre sul lago scelto. Non viene proposto un giro completo dei due laghi in giornata; attraversamenti e trasferimenti sono valutati separatamente.",
  },
  {
    id: "gourmet",
    duration: "Pranzo o cena",
    format: "Tavolo e menu su richiesta",
    lakes: ["como", "maggiore"],
    category: "taste",
    title: "Itinerari gourmet sul lago",
    location: "Ristoranti del lago scelto",
    icon: "utensils",
    featured: true,
    summary:
      "Scopra le tavole del territorio, tra pranzi vista lago e cene degustazione da scegliere secondo i suoi gusti.",
    description:
      "Un pranzo vista lago o una cena con menu degustazione. Scegliamo insieme le tavole e i sapori da scoprire, con un percorso gourmet che può accompagnare più giornate del soggiorno.",
    detail:
      "Ristoranti, menu, bevande, accompagnamento e trasferimenti vengono precisati nella proposta. Un itinerario gourmet può svilupparsi su più giornate; nessun tavolo è riservato prima della conferma.",
  },
  {
    id: "tasting",
    duration: "1–2 ore",
    format: "Degustazione da concordare",
    lakes: ["como", "maggiore"],
    category: "taste",
    title: "Gin & Wine Experience",
    location: "Cantine e distillerie da scegliere con i produttori",
    icon: "wine",
    summary: "Incontri produttori e scopra vini, gin e botaniche attraverso degustazioni guidate da concordare.",
    description:
      "Un calice di vino, i profumi di un gin, le botaniche raccontate da chi le sceglie. Degustazioni guidate e incontri con i produttori, per scoprire nuovi sapori e abbinarli a una sosta gourmet.",
    detail:
      "È possibile richiedere una degustazione di vini, un percorso dedicato al gin o entrambe le esperienze. Cantine, distillerie e sedi vengono selezionate sul lago scelto o nell’entroterra secondo disponibilità. Visite, assaggi, accompagnamento, eventuali abbinamenti e trasferimenti sono precisati nella proposta.",
  },
  {
    id: "cooking",
    duration: "Circa 3 ore",
    format: "Privata o condivisa da valutare",
    lakes: ["como", "maggiore"],
    category: "taste",
    title: "Lezioni di cucina italiana",
    location: "Sede e professionista da concordare",
    icon: "chef",
    summary: "Prepari una ricetta italiana con un cuoco e condivida a tavola il piacere di degustarla.",
    description:
      "Le mani in pasta, una ricetta italiana e i consigli di un cuoco. Un’esperienza da vivere in coppia, in famiglia o con gli amici, con il piacere di assaggiare ciò che si è preparato.",
    detail:
      "Menu, sede, lingua e numero di partecipanti dipendono dal professionista. Le attività per famiglie si concordano in base all’età degli ospiti e al programma disponibile.",
  },
  {
    id: "silk",
    duration: "Circa 2 ore",
    format: "Accessi produttivi da concordare",
    lakes: ["como"],
    category: "silk",
    title: "Como Silk Experience",
    location: "Como · distretto tessile comasco",
    icon: "factory",
    featured: true,
    summary:
      "Entri nel mondo della seta di Como, tra lavorazioni tessili, colore e appuntamenti in showroom.",
    description:
      "Vedere nascere un tessuto, scoprire il lavoro sul colore e riconoscere la qualità della seta. Un percorso guidato tra tessitura, tintoria e showroom del distretto comasco, con acquisti sempre facoltativi.",
    detail:
      "La proposta combina le tappe effettivamente visitabili: tessitura e/o tintoria, appuntamento in showroom ed eventuale visita museale. Accessi ai reparti, accompagnatori e lingue sono concordati con le aziende. Gli acquisti sono facoltativi e separati dai costi delle visite; non sono garantiti prezzi di fabbrica.",
  },
  {
    id: "golf",
    duration: "Mezza giornata",
    format: "Partita o lezione su richiesta",
    lakes: ["como"],
    category: "active",
    title: "Golf sul Lago di Como",
    location: "Menaggio · circolo da confermare",
    icon: "flag",
    featured: true,
    summary: "Dedichi una mezza giornata al golf, con una partita o una lezione in un circolo del territorio comasco.",
    description:
      "Una partita immersa nel paesaggio del Lario, oppure una lezione con un maestro. Valutiamo il circolo e i servizi adatti al suo livello, con il tempo per il gioco e per una cena sul lago.",
    detail:
      "Tee time, requisiti del circolo, attrezzatura e trasferimenti si verificano prima della conferma. Una lezione con maestro è una richiesta distinta dall’accesso al campo per giocare. Nessun accordo con il circolo è implicito.",
  },
  {
    id: "outdoor",
    duration: "2–4 ore",
    format: "Guida o noleggio da scegliere",
    lakes: ["como", "maggiore"],
    category: "active",
    title: "Passeggiate guidate ed e-bike",
    location: "Percorsi sul lago scelto",
    icon: "bike",
    summary: "Esplori sentieri e borghi a piedi o in e-bike, con un percorso scelto per il suo ritmo.",
    description:
      "Una passeggiata con vista o un percorso in e-bike tra natura e borghi, accompagnati da personale competente. Durata, dislivello e ritmo vengono scelti in base alla preparazione degli ospiti.",
    detail:
      "Guida, noleggio, attrezzatura, stagione e meteo sono valutati per la singola uscita. Una passeggiata, un trekking e un percorso sportivo in e-bike richiedono preparazioni diverse.",
  },
  {
    id: "paddle",
    duration: "1–2 ore",
    format: "Uscita guidata o noleggio",
    lakes: ["como", "maggiore"],
    category: "active",
    title: "Kayak, SUP e vela",
    location: "Località e centro nautico da concordare",
    icon: "waves",
    summary: "Scelga tra kayak, SUP o vela e viva il lago con una lezione o un’uscita organizzata.",
    description:
      "Pagaiare vicino alla riva, provare il SUP o avvicinarsi alla vela. Una lezione o un’uscita da scegliere con un centro nautico, secondo esperienza, stagione e condizioni del lago.",
    detail:
      "Sono discipline alternative, da valutare separatamente secondo età, preparazione, vento e attrezzatura. Il programma e l’accompagnamento sono definiti con il centro nautico.",
  },
  {
    id: "wellness",
    duration: "90 minuti–3 ore",
    format: "Accesso e trattamenti su richiesta",
    lakes: ["como", "maggiore"],
    category: "active",
    title: "Benessere e tempo per sé",
    location: "Struttura da scegliere sul lago",
    icon: "sparkles",
    summary: "Si conceda una pausa in spa o una sessione di yoga, scegliendo il momento ideale del soggiorno.",
    description:
      "Una pausa in spa, una sessione di yoga, un momento dedicato soltanto a sé. Il piacere di rallentare tra una visita e una cena, scegliendo la struttura e l’attività più adatte al soggiorno.",
    detail:
      "Accesso per ospiti esterni, professionisti, trattamenti e durata vengono verificati con la struttura. Non sono dichiarati benefici terapeutici né inclusioni non confermate.",
  },
  {
    id: "jet-ski",
    duration: "Da concordare",
    format: "Patente nautica richiesta",
    lakes: ["como", "maggiore"],
    category: "active",
    title: "Noleggio moto d’acqua con patente nautica",
    location: "Centro nautico da concordare sul lago scelto",
    icon: "waves",
    summary: "Viva il lago in moto d’acqua. Noleggio su richiesta per ospiti con patente nautica valida.",
    description:
      "Il noleggio è riservato a chi possiede una patente nautica valida e idonea alla conduzione del mezzo. Verifichiamo disponibilità, documenti, aree di navigazione e condizioni di noleggio con l’operatore prima della conferma.",
    detail:
      "Attività su richiesta, da confermare con un operatore autorizzato nell’area prescelta. Disponibilità, aree e orari consentiti, documenti, abilitazioni, età minima, briefing, dotazioni e condizioni meteo vengono verificati prima della prenotazione. La selezione non garantisce l’erogazione su entrambi i laghi.",
  },
  {
    id: "milano",
    duration: "3 ore o una giornata",
    format: "Guida e trasferimenti da valutare",
    lakes: ["como", "maggiore"],
    category: "city",
    title: "Visit Milano",
    location: "Milano · escursione dal lago",
    icon: "landmark",
    summary: "Parta dal lago alla scoperta di Milano, tra arte, moda, shopping e una possibile sosta gourmet.",
    description:
      "Dal lago a Milano per una giornata tra il Duomo, la Galleria Vittorio Emanuele II e i quartieri della moda. La visita può abbinare accompagnamento culturale, appuntamenti per lo shopping e una sosta gourmet, seguendo i suoi interessi.",
    detail:
      "Escursione da organizzare dalla base del soggiorno sul Lago di Como o sul Lago Maggiore. Trasferimenti, accompagnamento, durata, ingressi e appuntamenti sono da concordare e quotare. Non sono inclusi automaticamente accessi prioritari, visite agli interni o servizi di personal shopping.",
  },
  {
    id: "go-kart",
    duration: "Sessioni o mini GP",
    format: "Formula per coppie o gruppi",
    lakes: ["como", "maggiore"],
    category: "active",
    title: "Go Kart Experience",
    location: "Circuito da concordare in base al soggiorno",
    icon: "flag",
    featured: true,
    summary: "Condivida l’emozione della pista con una sessione di kart o una sfida per il suo gruppo.",
    description:
      "Una pausa adrenalinica da condividere in coppia, tra amici o con il proprio gruppo: sessioni di kart su un circuito selezionato in base al soggiorno e alla preparazione dei partecipanti.",
    detail:
      "Circuito, trasferimenti, durata e formula vengono concordati su richiesta. Partecipazione soggetta a disponibilità, briefing e requisiti di età, altezza e sicurezza del gestore. Pista in esclusiva solo se confermata nel preventivo.",
  },
  {
    id: "jungle-park",
    duration: "Mezza giornata",
    format: "Percorsi secondo età e preparazione",
    lakes: ["como", "maggiore"],
    category: "active",
    title: "Jungle Park Experience",
    location: "Parco avventura da concordare in base al soggiorno",
    icon: "mountain",
    featured: true,
    summary:
      "Viva una giornata nella natura tra ponti sospesi e percorsi sugli alberi, adatti al suo gruppo.",
    description:
      "Un’esperienza nella natura tra percorsi sospesi, passaggi tra gli alberi e momenti da condividere. Il parco e il livello del percorso vengono scelti in base al gruppo, per unire avventura e piacere di stare insieme.",
    detail:
      "La proposta riguarda un parco avventura da individuare, senza indicare un gestore già convenzionato. Aperture, condizioni meteo, requisiti di età e altezza, attrezzatura e assistenza tecnica sono da confermare con il parco prima della prenotazione.",
  },
  {
    id: "islands",
    duration: "Mezza giornata o giornata",
    format: "Barca, guida e ingressi da definire",
    lakes: ["maggiore"],
    category: "lake",
    title: "Stresa e le Isole Borromee",
    location: "Stresa · Isola Bella · Isola Madre",
    icon: "landmark",
    featured: true,
    summary: "Navighi da Stresa verso le Isole Borromee e scopra palazzi e giardini in una visita accompagnata.",
    description:
      "Da Stresa alle Isole Borromee, tra palazzi, giardini e scorci sull’acqua. Una visita accompagnata a Isola Bella o Isola Madre, da completare con una sosta sull’Isola dei Pescatori quando il programma lo consente.",
    detail:
      "Navigazione, ingressi e ristorazione sono servizi distinti. Le aperture dei siti monumentali non coincidono con l’accessibilità di tutte le isole. Si valuta anche una sosta sull’Isola dei Pescatori, secondo il programma.",
  },
  {
    id: "caterina",
    duration: "Circa 2 ore",
    format: "Visita e arrivo da coordinare",
    lakes: ["maggiore"],
    category: "lake",
    title: "Santa Caterina del Sasso",
    location: "Leggiuno · sponda lombarda",
    icon: "landmark",
    featured: true,
    summary: "Visiti l’eremo di Santa Caterina del Sasso, affacciato sul Verbano, e scopra la sponda lombarda.",
    description:
      "Un eremo affacciato sulla parete rocciosa, con il Lago Maggiore davanti agli occhi. Una visita accompagnata a Santa Caterina del Sasso, da abbinare a una passeggiata o a un pranzo sulla sponda lombarda.",
    detail:
      "Accessi, celebrazioni e visita si verificano con il gestore. L’arrivo può essere via terra o, quando le corse lo consentono, via lago. Il battello non è garantito in ogni stagione.",
  },
  {
    id: "golf-maggiore",
    duration: "Mezza giornata",
    format: "Accesso al campo ed extra da definire",
    lakes: ["maggiore"],
    category: "active",
    title: "Golf tra Stresa e il Vergante",
    location: "Lago Maggiore · Alto Vergante",
    icon: "flag",
    featured: true,
    summary:
      "Giochi a golf tra Stresa e il Vergante, con la possibilità di organizzare trasferimento e sosta gourmet.",
    description:
      "Una giornata di golf tra Stresa e il Vergante, con il tempo per concentrarsi sulla partita. Trasferimenti, attrezzatura ed eventuale lezione si possono coordinare, insieme a una sosta gourmet dopo il gioco.",
    detail:
      "Orari di partenza, requisiti, maestro, attrezzatura, gare e calendario invernale vanno verificati. La presenza del circolo nella proposta non indica un accordo commerciale già concluso.",
  },
];

export const BOAT_PACKAGES = [
  {
    id: "captain",
    number: "01",
    title: "Il lago con capitano",
    format: "Tour privato · capitano a bordo",
    summary:
      "Il capitano alla guida, il tempo per osservare ville e borghi dall’acqua.",
    audience: "Per chi desidera dedicarsi soltanto al paesaggio",
    description:
      "Le rive scorrono mentre il capitano conduce la navigazione. Un’uscita privata da costruire intorno alle ville, ai borghi e al punto di partenza più adatto al soggiorno.",
    features: [
      "Imbarcazione e capitano da confermare",
      "Itinerario privato sul lago scelto",
      "Durata e soste personalizzabili",
    ],
    detail:
      "Modello, capienza, durata, personale e punto di imbarco vengono precisati nel preventivo. Approdi, ingressi alle ville, trasferimenti e ristorazione sono inclusi soltanto se espressamente indicati.",
  },

  {
    id: "aperitif",
    number: "02",
    title: "Aperitivo sull’acqua",
    format: "Capitano · aperitivo a bordo",
    summary:
      "Un’uscita privata con capitano, un calice e assaggi da concordare.",
    audience: "Per una coppia, una ricorrenza o un piccolo gruppo",
    description:
      "Un calice, una selezione di sapori e il lago nella luce del tardo pomeriggio. Un’uscita con capitano, pensata per condividere un momento speciale senza occuparsi della navigazione.",
    features: [
      "Navigazione privata con capitano",
      "Proposta di aperitivo da concordare",
      "Orario scelto in funzione della stagione",
    ],
    detail:
      "Bevande, assaggi, eventuali alternative analcoliche, durata e numero di ospiti vengono definiti con l’operatore. La luce del tramonto dipende da periodo e meteo; champagne, fotografo e allestimenti sono eventuali extra da quotare.",
  },

  {
    id: "signature",
    number: "03",
    title: "Una giornata privata sul lago",
    format: "Capitano · itinerario su misura",
    summary:
      "Navigazione, visita e pranzo da abbinare in una giornata personale.",
    audience: "Per vivere più momenti in un unico percorso",
    description:
      "La navigazione, una visita accompagnata e un pranzo da ricordare. Una proposta di giornata con capitano che mette in relazione le tappe, lasciando spazio alle soste e al tempo libero.",
    features: [
      "Itinerario da sviluppare con il capitano",
      "Visita a una villa, un’isola o un borgo da valutare",
      "Ristorante e trasferimenti coordinabili",
    ],
    detail:
      "La proposta distingue ore di navigazione, visite, guida, ingressi, pasti e trasferimenti. Non è garantito il prelievo dal pontile dell’hotel: l’approdo va verificato. Costi, inclusioni e alternative meteo sono indicati prima di ogni conferma.",
  },

  {
    id: "freedom",
    number: "04",
    title: "Libertà sul lago",
    format: "Noleggio 40 CV · guida autonoma",
    summary:
      "La libertà di condurre la barca, con briefing e assistenza. Senza patente solo se i requisiti lo consentono.",
    audience: "Per chi desidera condurre la propria uscita",
    description:
      "Una barca da guidare personalmente, un itinerario suggerito e il tempo per osservare le rive. La formula senza patente è proposta soltanto per natanti e conducenti che ne rispettino i requisiti.",
    features: [
      "Noleggio dell’imbarcazione idonea",
      "Accoglienza, briefing e assistenza dell’operatore",
      "Percorso e durata da concordare",
    ],
    detail:
      "Prima della conferma vengono verificati caratteristiche complete di barca e motore, requisiti del conducente, cauzione, carburante, coperture e condizioni. La potenza di 40 CV, da sola, non garantisce la conduzione senza patente. Il capitano non è incluso nella formula a guida autonoma.",
  },
] as const;

export const JOURNEYS = [
  {
    id: "first",
    number: "01",
    title: "Il primo incontro con il Lario",
    subtitle: "Ville, navigazione e borghi",
    lake: "Lago di Como",
    description:
      "Una villa da visitare con accompagnamento, il lago visto dall’acqua e il tempo per un borgo. Poche tappe nella stessa area, da costruire partendo dall’hotel.",
    stops: ["Una villa", "La navigazione", "Un borgo"],
    interests: ["villas", "boat", "villages"],
  },
  {
    id: "silk",
    number: "02",
    title: "Como Silk Experience",
    subtitle: "La seta di Como, da vivere",
    lake: "Lago di Como",
    description:
      "Un percorso guidato nelle lavorazioni della seta, un appuntamento in showroom e, su richiesta, una sosta gourmet. Le aziende visitabili determinano la composizione delle tappe.",
    stops: ["Trama e colore", "Showroom", "Sosta gourmet facoltativa"],
    interests: ["silk", "gourmet"],
  },
  {
    id: "golf",
    number: "03",
    title: "Tra green e Lago di Como",
    subtitle: "Una giornata intorno alla partita",
    lake: "Lago di Como",
    description:
      "Trasferimento da valutare dall’hotel, partita a golf e cena. Il percorso riserva al gioco il tempo necessario, senza aggiungere visite incompatibili con la giornata.",
    stops: ["Trasferimento", "Golf", "Cena"],
    interests: ["golf", "gourmet"],
  },
  {
    id: "maggiore",
    number: "01",
    title: "Il Maggiore, tra isole e giardini",
    subtitle: "Stresa e il paesaggio delle Borromee",
    lake: "Lago Maggiore",
    description:
      "Partenza da valutare a Stresa, visita accompagnata a una delle isole e una pausa a tavola. Aperture e collegamenti guidano la scelta dell’isola e dell’ordine delle tappe.",
    stops: ["Stresa", "Un’isola", "Pranzo"],
    interests: ["islands", "boat", "gourmet"],
  },
  {
    id: "caterina",
    number: "02",
    title: "Il Verbano, tra eremo e tavola",
    subtitle: "La sponda lombarda del Maggiore",
    lake: "Lago Maggiore",
    description:
      "Santa Caterina del Sasso come visita principale, il lungolago e un ristorante nella stessa zona. Il percorso viene accompagnato e coordinato secondo il periodo.",
    stops: ["Santa Caterina del Sasso", "Passeggiata", "Pranzo"],
    interests: ["caterina", "gourmet"],
  },
  {
    id: "golf-maggiore",
    number: "03",
    title: "Il green del Lago Maggiore",
    subtitle: "Golf e ospitalità tra Stresa e Vergante",
    lake: "Lago Maggiore",
    description:
      "Una partita nel territorio del Verbano, trasferimenti dall’hotel da concordare e una cena dopo il gioco. Circolo e tee time si scelgono secondo livello e disponibilità.",
    stops: ["Trasferimento", "Golf", "Cena"],
    interests: ["golf-maggiore", "gourmet"],
  },
] as const;
export const LOGISTICS = [
  {
    id: "pickup",
    title: "Pick-up in aeroporto o in stazione",
    summary: "Accoglienza e trasferimento verso l’hotel o la prima tappa.",
  },
  {
    id: "hotel",
    title: "Hotel da scegliere insieme",
    summary:
      "Una struttura da valutare in base a stile, posizione e soggiorno.",
  },
  {
    id: "car",
    title: "Noleggio auto",
    summary:
      "Un’auto per gli spostamenti, con ritiro e riconsegna da concordare.",
  },
] as const;
export const FAQ = [
  [
    "Come si crea un pacchetto personalizzato?",
    "Compili un unico modulo in tre passaggi: lago, ospiti e periodo; esperienze da selezionare; recapiti e servizi utili. Le formule in barca si scelgono nella stessa scheda. Può aggiungere o rimuovere le attività con le caselle e rivedere tutto prima dell’invio. Il salvataggio facoltativo nell’account e la richiesta non confermano una prenotazione. Può anche scriverci su WhatsApp o via email.",
  ],
  [
    "È possibile richiedere una sola esperienza?",
    "Sì. È possibile scegliere una singola attività, partire da un hotel già prenotato oppure richiedere un soggiorno più ampio. I percorsi presentati sono esempi personalizzabili.",
  ],
  [
    "Come si sceglie tra Lago di Como e Lago Maggiore?",
    "La proposta parte da interessi, periodo e luogo del soggiorno. Visitare entrambi i laghi richiede tempo per gli spostamenti: vengono organizzati come destinazioni distinte.",
  ],
  [
    "È previsto personale di accompagnamento?",
    "La proposta prevede un referente per il coordinamento e personale competente per le singole attività: guide per le visite, professionisti per sport e degustazioni, capitano nelle formule nautiche assistite. Nel noleggio a guida autonoma sono previsti briefing e assistenza dell’operatore; l’eventuale presenza di personale a bordo è da concordare.",
  ],
  [
    "Il pick-up può partire da un aeroporto o da una stazione?",
    "Sì. La richiesta può indicare l’aeroporto o la stazione ferroviaria di arrivo desiderati. Accoglienza, trasferimento, orari e destinazione vengono verificati con l’operatore e specificati nella proposta.",
  ],
  [
    "Una barca da 40 CV può essere guidata senza patente?",
    "La formula viene valutata solo per natanti e conducenti idonei. La potenza non è l’unico criterio: caratteristiche del motore, requisiti personali e condizioni di utilizzo devono essere verificati dall’operatore prima della conferma.",
  ],
  [
    "Che cosa comprende Como Silk Experience?",
    "È il percorso guidato nella seta di Como, da comporre con le tappe visitabili: tessitura e/o tintoria, showroom ed eventuale museo. Accessi e accompagnamento sono concordati con le aziende. Gli acquisti sono facoltativi e separati dalle visite.",
  ],
  [
    "Si può organizzare una partita a golf sui due laghi?",
    "Sì, come richiesta da verificare. Si valutano circolo, tee time, requisiti di gioco, attrezzatura e trasferimenti. La lezione con un maestro e la partita sul campo sono proposte distinte.",
  ],
  [
    "Come funzionano prezzi, disponibilità e conferma?",
    "La richiesta non costituisce una prenotazione. Prima di procedere vengono presentati servizi, operatori, personale, costi, inclusioni e condizioni. Selezionare una formula non riserva imbarcazioni, ingressi o tavoli.",
  ],
  [
    "Che cosa accade in caso di maltempo?",
    "Nella proposta vengono valutate alternative adatte al periodo e alle attività scelte. Sostituzioni, rinvii e condizioni di cancellazione sono concordati prima della conferma.",
  ],
] as const;

export type ExperienceContent = {
  EXPERIENCE_CATEGORIES: typeof EXPERIENCE_CATEGORIES;
  EXPERIENCES: typeof EXPERIENCES;
  BOAT_PACKAGES: typeof BOAT_PACKAGES;
  JOURNEYS: typeof JOURNEYS;
  LOGISTICS: typeof LOGISTICS;
  FAQ: typeof FAQ;
};
