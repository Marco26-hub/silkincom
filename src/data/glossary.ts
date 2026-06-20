export type GlossaryTerm = {
  term: string;
  short: string;
  long: string;
};

export type GlossaryContent = {
  metaTitle: string;
  metaDescription: string;
  schemaName: string;
  breadcrumb: string;
  eyebrow: string;
  h1Start: string;
  h1Emphasis: string;
  intro: string;
  index: string;
  questionTemplate: string;
  ctaPrompt: string;
  ctaHistory: string;
  ctaAuthenticity: string;
  terms: GlossaryTerm[];
};

const GLOSSARY_CONTENT = {
  "it": {
    "metaTitle": "Glossario tessile — Seta, cashmere e tessitura",
    "metaDescription": "Definizioni chiare dei principali termini tessili: seta di Como, rouletté, jacquard, twill, micron, GSM, filato e finissaggio.",
    "schemaName": "Glossario tessile SILKinCOM",
    "breadcrumb": "Glossario",
    "eyebrow": "Conoscenza tessile",
    "h1Start": "Glossario",
    "h1Emphasis": "tessile",
    "intro": "Le parole essenziali della seta, del cashmere e della tessitura, spiegate con precisione per leggere un’etichetta e scegliere con maggiore consapevolezza.",
    "index": "Indice",
    "questionTemplate": "Che cos’è {term}?",
    "ctaPrompt": "Vuoi approfondire la cultura tessile di Como?",
    "ctaHistory": "Storia della seta a Como",
    "ctaAuthenticity": "Come riconoscere la seta vera",
    "terms": [
      {
        "term": "Seta di Como",
        "short": "Seta progettata, tessuta, stampata o rifinita nel distretto tessile comasco.",
        "long": "L’espressione descrive la tradizione manifatturiera della provincia di Como. Non indica necessariamente l’origine italiana della fibra grezza: per valutare un prodotto occorre leggere composizione, provenienza e lavorazioni dichiarate dal produttore."
      },
      {
        "term": "Rouletté",
        "short": "Orlo arrotolato, tradizionalmente eseguito a mano sui foulard di seta.",
        "long": "Il bordo viene ripiegato e arrotolato con piccoli punti, creando una finitura morbida e leggermente in rilievo. Regolarità, elasticità e pulizia del punto aiutano a valutarne l’esecuzione."
      },
      {
        "term": "Jacquard",
        "short": "Tecnica di tessitura che costruisce il motivo direttamente nell’intreccio del tessuto.",
        "long": "Il telaio controlla separatamente gruppi di fili dell’ordito, rendendo possibili disegni complessi. Il motivo non è applicato in superficie: nasce dalla struttura stessa del tessuto."
      },
      {
        "term": "Twill (saglia)",
        "short": "Armatura riconoscibile dalle sottili linee diagonali sulla superficie.",
        "long": "La struttura diagonale offre un buon equilibrio tra fluidità, corpo e resistenza. Per questo il twill è spesso utilizzato nei foulard e negli accessori in seta destinati all’uso quotidiano."
      },
      {
        "term": "Satin (raso)",
        "short": "Armatura dalla superficie liscia e luminosa, con pochi punti d’intreccio visibili.",
        "long": "I fili restano più a lungo esposti sulla superficie e riflettono la luce in modo uniforme. Il raso ha una mano fluida, ma può richiedere più attenzione contro fili tirati e abrasioni."
      },
      {
        "term": "Ordito e trama",
        "short": "I due sistemi di fili che si incrociano per formare un tessuto.",
        "long": "L’ordito corre nel senso della lunghezza ed è teso sul telaio; la trama lo attraversa nel senso della larghezza. Il loro rapporto determina struttura, compattezza, peso e drappeggio."
      },
      {
        "term": "Micron (μm)",
        "short": "Unità usata per indicare il diametro medio di una fibra.",
        "long": "Un valore più basso descrive una fibra più fine, ma non basta da solo a definire la qualità. Lunghezza, uniformità, resistenza, selezione e lavorazione della fibra influenzano il risultato finale."
      },
      {
        "term": "GSM",
        "short": "Grammi per metro quadrato: misura il peso superficiale di un tessuto.",
        "long": "Il GSM aiuta a confrontare densità e peso, ma non è un voto di qualità. Due tessuti con lo stesso valore possono avere mano e prestazioni diverse in base a fibra, filato, armatura e finissaggio."
      },
      {
        "term": "Denier",
        "short": "Unità che esprime la massa in grammi di 9.000 metri di filato.",
        "long": "A parità di materiale, un valore più basso corrisponde in genere a un filato più fine. La resa del tessuto dipende comunque anche da torsione, densità e costruzione."
      },
      {
        "term": "Filato",
        "short": "Filo continuo ottenuto unendo o torcendo fibre tessili.",
        "long": "Il filato è il passaggio tra fibra e tessuto. Titolo, torsione, regolarità e tipo di fibra contribuiscono a definire morbidezza, resistenza, lucentezza e aspetto del prodotto finito."
      },
      {
        "term": "Pashmina",
        "short": "Termine storico legato a fibre fini dell’area himalayana, oggi usato anche per indicare una stola ampia.",
        "long": "Nel commercio contemporaneo la parola può descrivere forma e stile, non necessariamente la composizione. Per sapere se una pashmina è in cashmere, lana o misto è indispensabile controllare l’etichetta."
      },
      {
        "term": "Foulard",
        "short": "Accessorio leggero, spesso quadrato, indossato al collo, tra i capelli o su una borsa.",
        "long": "Può essere realizzato in seta o in altri materiali e in molte dimensioni. Composizione, armatura, stampa e tipo di orlo ne determinano mano, caduta e modalità di cura."
      },
      {
        "term": "Finissaggio",
        "short": "Insieme dei trattamenti finali che definiscono mano, aspetto e comportamento del tessuto.",
        "long": "Lavaggi, vaporizzo, calandratura e altri processi possono modificare morbidezza, lucentezza, stabilità e resa del colore. Il ciclo corretto dipende dalla fibra e dal risultato desiderato."
      }
    ]
  },
  "en": {
    "terms": [
      {
        "term": "Como silk",
        "short": "Silk designed, woven, printed or finished in the Como textile district.",
        "long": "The expression describes the manufacturing tradition of the province of Como. It does not necessarily indicate the Italian origin of the raw fibre: to evaluate a product it is necessary to read the composition, origin and processing declared by the manufacturer."
      },
      {
        "term": "Rouletté",
        "short": "Rolled hem, traditionally handmade on silk scarves.",
        "long": "The edge is folded and rolled with small stitches, creating a soft, slightly raised finish. Regularity, elasticity and cleanliness of the stitch help to evaluate the execution."
      },
      {
        "term": "Jacquard",
        "short": "Weaving technique that builds the pattern directly into the weave of the fabric.",
        "long": "The loom controls groups of warp threads separately, making complex designs possible. The pattern is not applied to the surface: it arises from the structure of the fabric itself."
      },
      {
        "term": "Twill weave",
        "short": "Weave recognizable by thin diagonal lines on the surface.",
        "long": "The diagonal structure offers a good balance between fluidity, body and resistance. For this reason, twill is often used in silk scarves and accessories intended for everyday use."
      },
      {
        "term": "Satin weave",
        "short": "Weave with a smooth and bright surface, with few visible weave points.",
        "long": "The threads remain exposed on the surface for longer and reflect the light evenly. Satin has a fluid feel, but may require more attention against pulled threads and abrasions."
      },
      {
        "term": "Warp and weft",
        "short": "The two systems of threads that cross each other to form a fabric.",
        "long": "The warp runs lengthwise and is stretched on the loom; the weft passes through it widthwise. Their relationship determines structure, compactness, weight and drape."
      },
      {
        "term": "Micron (μm)",
        "short": "Unit used to indicate the average diameter of a fiber.",
        "long": "A lower value describes a finer fibre, but is not enough on its own to define quality. Fiber length, uniformity, strength, selection and processing influence the final result."
      },
      {
        "term": "GSM",
        "short": "Grams per square meter: measures the surface weight of a fabric.",
        "long": "GSM helps compare density and weight, but is not a quality rating. Two fabrics with the same value can have different feel and performance based on fibre, yarn, weave and finishing."
      },
      {
        "term": "Denier",
        "short": "Unit expressing the mass in grams of 9,000 meters of yarn.",
        "long": "For the same material, a lower value generally corresponds to a finer yarn. However, the character of the fabric also depends on twist, density and construction."
      },
      {
        "term": "Yarn",
        "short": "Continuous thread obtained by joining or twisting textile fibres.",
        "long": "Yarn is the transition between fiber and fabric. Count, twist, regularity and type of fiber contribute to defining the softness, resistance, shine and appearance of the finished product."
      },
      {
        "term": "Pashmina",
        "short": "Historical term linked to fine fibers from the Himalayan area, today also used to indicate a wide stole.",
        "long": "In contemporary commerce the word can describe shape and style, not necessarily composition. To find out if a pashmina is made of cashmere, wool or a blend, it is essential to check the label."
      },
      {
        "term": "Foulard",
        "short": "Lightweight accessory, often square, worn around the neck, in the hair or on a bag.",
        "long": "It can be made of silk or other materials and in many sizes. Composition, weave, print and type of hem determine its feel, fall and care methods."
      },
      {
        "term": "Textile finishing",
        "short": "Set of final treatments that define the hand, appearance and behavior of the fabric.",
        "long": "Washing, steaming, calendering and other processes can change softness, shine, stability and color rendering. The correct cycle depends on the fiber and the desired result."
      }
    ],
    "metaTitle": "Textile glossary — Silk, cashmere and weaving",
    "metaDescription": "Clear definitions of the main textile terms: Como silk, roulette, jacquard, twill, micron, GSM, yarn and finishing.",
    "schemaName": "SILKinCOM Textile Glossary",
    "breadcrumb": "Glossary",
    "eyebrow": "Textile knowledge",
    "h1Start": "Textile",
    "h1Emphasis": "glossary",
    "intro": "Essential terms from silk, cashmere and weaving, explained clearly so you can read a label and choose with confidence.",
    "index": "Index",
    "questionTemplate": "What is {term}?",
    "ctaPrompt": "Explore Como's textile culture.",
    "ctaHistory": "History of silk in Como",
    "ctaAuthenticity": "How to recognize real silk"
  },
  "es": {
    "terms": [
      {
        "term": "Seda de Como",
        "short": "Seda diseñada, tejida, estampada o acabada en el distrito textil de Como.",
        "long": "La expresión describe la tradición manufacturera de la provincia de Como. No indica necesariamente el origen italiano de la fibra bruta: para evaluar un producto es necesario leer la composición, el origen y la elaboración declarada por el fabricante."
      },
      {
        "term": "Rouletté",
        "short": "Dobladillo enrollado, tradicionalmente hecho a mano sobre pañuelos de seda.",
        "long": "El borde está doblado y enrollado con pequeñas puntadas, creando un acabado suave y ligeramente elevado. La regularidad, elasticidad y limpieza de la puntada ayudan a evaluar la ejecución."
      },
      {
        "term": "Jacquard",
        "short": "Técnica de tejido que construye el patrón directamente en el tejido de la tela.",
        "long": "El telar controla grupos de hilos de urdimbre por separado, posibilitando diseños complejos. El patrón no se aplica a la superficie: surge de la estructura del propio tejido."
      },
      {
        "term": "Twill (sarga)",
        "short": "Armadura reconocible por finas líneas diagonales en la superficie.",
        "long": "La estructura diagonal ofrece un buen equilibrio entre fluidez, cuerpo y resistencia. Por este motivo, la sarga se utiliza a menudo en pañuelos de seda y accesorios de uso diario."
      },
      {
        "term": "Satén (raso)",
        "short": "Armadura de superficie lisa y brillante, con pocos puntos de tejido visibles.",
        "long": "Los hilos permanecen más tiempo expuestos en la superficie y reflejan la luz de manera uniforme. El satén tiene un tacto suave, pero puede requerir más atención contra los hilos tirados y las abrasiones."
      },
      {
        "term": "Urdimbre y trama",
        "short": "Los dos sistemas de hilos que se cruzan para formar un tejido.",
        "long": "La urdimbre corre longitudinalmente y se estira en el telar; la trama lo atraviesa a lo ancho. Su relación determina la estructura, la compacidad, el peso y la caída."
      },
      {
        "term": "Micrón (μm)",
        "short": "Unidad utilizada para indicar el diámetro medio de una fibra.",
        "long": "Un valor más bajo describe una fibra más fina, pero no es suficiente por sí solo para definir la calidad. La longitud, uniformidad, resistencia, selección y procesamiento de la fibra influyen en el resultado final."
      },
      {
        "term": "GSM",
        "short": "Gramos por metro cuadrado: mide el peso superficial de un tejido.",
        "long": "GSM ayuda a comparar la densidad y el peso, pero no es una calificación de calidad. Dos tejidos con el mismo valor pueden tener diferente tacto y rendimiento según la fibra, el hilo, el tejido y el acabado."
      },
      {
        "term": "Denier",
        "short": "Unidad que expresa la masa en gramos de 9.000 metros de hilo.",
        "long": "Para el mismo material, un valor más bajo corresponde generalmente a un hilo más fino. Sin embargo, el rendimiento del tejido también depende de la torsión, la densidad y la construcción."
      },
      {
        "term": "Hilado",
        "short": "Hilo continuo obtenido uniendo o retorciendo fibras textiles.",
        "long": "El hilado es el paso entre la fibra y el tejido. El título, la torsión, regularidad y tipo de fibra contribuyen a definir la suavidad, resistencia, brillo y apariencia del producto terminado."
      },
      {
        "term": "Pashmina",
        "short": "Término histórico vinculado a las fibras finas de la zona del Himalaya, hoy también se utiliza para indicar una estola ancha.",
        "long": "En el comercio contemporáneo, la palabra puede describir la forma y estilo, no necesariamente composición. Para saber si una pashmina está hecha de cachemira, lana o una mezcla, es imprescindible consultar la etiqueta."
      },
      {
        "term": "Foulard",
        "short": "Accesorio ligero, a menudo cuadrado, que se lleva alrededor del cuello, en el pelo o en el bolso.",
        "long": "Puede ser de seda u otros materiales y de muchos tamaños. La composición, el tejido, el estampado y el tipo de dobladillo determinan su tacto, caída y métodos de cuidado."
      },
      {
        "term": "Acabado textil",
        "short": "Conjunto de tratamientos finales que definen el tacto, aspecto y comportamiento del tejido.",
        "long": "El lavado, el vapor, el calandrado y otros procesos pueden cambiar la suavidad, el brillo, la estabilidad y la reproducción cromática. El ciclo correcto depende de la fibra y del resultado deseado."
      }
    ],
    "metaTitle": "Glosario textil: seda, cachemira y tejido",
    "metaDescription": "Definiciones claras de los principales términos textiles: seda de Como, rouletté, jacquard, sarga, micrón, GSM, hilado y acabado.",
    "schemaName": "Glosario textil SILKinCOM",
    "breadcrumb": "Glosario",
    "eyebrow": "Conocimiento textil",
    "h1Start": "Glosario",
    "h1Emphasis": "textil",
    "intro": "Los términos esenciales de la seda, el cachemir y el tejido, explicados con claridad para leer una etiqueta y elegir con mayor criterio.",
    "index": "Índice",
    "questionTemplate": "¿Qué es {term}?",
    "ctaPrompt": "¿Quieres profundizar en la cultura textil de Como?",
    "ctaHistory": "Historia de la seda en Como",
    "ctaAuthenticity": "Cómo reconocer la seda auténtica"
  },
  "fr": {
    "terms": [
      {
        "term": "Soie de Côme",
        "short": "Soie conçue, tissée, imprimée ou finie dans le district textile de Côme.",
        "long": "L'expression décrit la tradition manufacturière de la province de Côme. Elle n'indique pas nécessairement l'origine italienne de la fibre brute : pour évaluer un produit, il est nécessaire de lire la composition, l'origine et la transformation déclarées par le fabricant."
      },
      {
        "term": "Rouletté",
        "short": "Ourlet roulé, traditionnellement fait à la main sur des foulards en soie.",
        "long": "Le bord est plié et roulé avec de petits points, créant une finition douce et légèrement en relief. La régularité, l'élasticité et la propreté du point permettent d'évaluer l'exécution."
      },
      {
        "term": "Jacquard",
        "short": "Technique de tissage qui intègre le motif directement dans le tissage du tissu.",
        "long": "Le métier à tisser contrôle des groupes de fils de chaîne séparément, ce qui rend possible des conceptions complexes. Le motif n’est pas appliqué à la surface : il résulte de la structure même du tissu."
      },
      {
        "term": "Twill (sergé)",
        "short": "Armure reconnaissable à de fines lignes diagonales en surface.",
        "long": "La structure diagonale offre un bon équilibre entre fluidité, corps et résistance. Pour cette raison, le sergé est souvent utilisé dans les foulards en soie et les accessoires destinés à un usage quotidien."
      },
      {
        "term": "Satin",
        "short": "Armure à surface lisse et brillante, avec peu de points de tissage visibles.",
        "long": "Les fils restent exposés plus longtemps à la surface et réfléchissent la lumière de manière uniforme. Le satin a un toucher doux, mais peut nécessiter plus d'attention contre les fils tirés et les abrasions."
      },
      {
        "term": "Chaîne et trame",
        "short": "Les deux systèmes de fils qui se croisent pour former un tissu.",
        "long": "La chaîne s'étend dans le sens de la longueur et est tendue sur le métier à tisser ; la trame le traverse dans le sens de la largeur. Leur relation détermine la structure, la compacité, le poids et le drapé."
      },
      {
        "term": "Micron (μm)",
        "short": "Unité utilisée pour indiquer le diamètre moyen d'une fibre.",
        "long": "Une valeur inférieure décrit une fibre plus fine, mais ne suffit pas à elle seule à définir la qualité. La longueur, l'uniformité, la résistance, la sélection et le traitement des fibres influencent le résultat final."
      },
      {
        "term": "GSM",
        "short": "Grammes par mètre carré : mesure le grammage d'un tissu.",
        "long": "Le GSM permet de comparer la densité et le poids, mais ne constitue pas une évaluation de la qualité. Deux tissus de même valeur peuvent avoir un toucher et des performances différents en fonction de la fibre, du fil, du tissage et de la finition."
      },
      {
        "term": "Denier",
        "short": "Unité exprimant la masse en grammes de 9 000 mètres de fil.",
        "long": "Pour une même matière, une valeur inférieure correspond généralement à un fil plus fin. Cependant, les performances du tissu dépendent également de la torsion, de la densité et de la construction."
      },
      {
        "term": "Fil",
        "short": "Fil continu obtenu par assemblage ou torsion de fibres textiles.",
        "long": "Le fil est la transition entre la fibre et le tissu. Le nombre, la torsion, la régularité et le type de fibre contribuent à définir la douceur, la résistance, la brillance et l'apparence du produit fini."
      },
      {
        "term": "Pashmina",
        "short": "Terme historique lié aux fibres fines de la zone himalayenne, aujourd'hui également utilisé pour désigner une étole large.",
        "long": "Dans le commerce contemporain, le mot peut décrire la forme et le style, pas nécessairement la composition. Pour savoir si un pashmina est en cachemire, en laine ou en mélange, il est indispensable de vérifier l'étiquette."
      },
      {
        "term": "Foulard",
        "short": "Accessoire léger, souvent carré, porté autour du cou, dans les cheveux ou sur un sac.",
        "long": "Il peut être fait de soie ou d’autres matériaux et dans de nombreuses tailles. La composition, le tissage, l'imprimé et le type d'ourlet déterminent son toucher, son tombé et ses méthodes d'entretien."
      },
      {
        "term": "Finissage textile",
        "short": "Ensemble de traitements finaux qui définissent le toucher, l'apparence et le comportement du tissu.",
        "long": "Le lavage, la vaporisation, le calandrage et d’autres procédés peuvent modifier la douceur, la brillance, la stabilité et le rendu des couleurs. Le bon cycle dépend de la fibre et du résultat souhaité."
      }
    ],
    "metaTitle": "Glossaire textile — Soie, cachemire et tissage",
    "metaDescription": "Définitions claires des principaux termes textiles : soie de Côme, roulette, jacquard, sergé, micron, GSM, fil et finition.",
    "schemaName": "Glossaire textile SILKinCOM",
    "breadcrumb": "Glossaire",
    "eyebrow": "Connaissance textile",
    "h1Start": "Glossaire",
    "h1Emphasis": "textile",
    "intro": "Les termes essentiels de la soie, du cachemire et du tissage, expliqués clairement pour lire une étiquette et choisir en connaissance de cause.",
    "index": "Sommaire",
    "questionTemplate": "Qu’est-ce que {term} ?",
    "ctaPrompt": "Voulez-vous approfondir la culture textile de Côme ?",
    "ctaHistory": "Histoire de la soie à Côme",
    "ctaAuthenticity": "Comment reconnaître la vraie soie"
  },
  "de": {
    "terms": [
      {
        "term": "Seide aus Como",
        "short": "Seide, entworfen, gewebt, bedruckt oder veredelt im Textilviertel Como.",
        "long": "Der Ausdruck beschreibt die Manufakturtradition der Provinz Como. Es gibt nicht unbedingt Auskunft über die italienische Herkunft der Rohfaser: Um ein Produkt zu bewerten, ist es notwendig, die vom Hersteller angegebene Zusammensetzung, Herkunft und Verarbeitung zu lesen."
      },
      {
        "term": "Rouletté",
        "short": "Rollsaum, traditionell handgefertigt bei Seidenschals.",
        "long": "Der Rand wird mit kleinen Stichen gefaltet und gerollt, wodurch ein weicher, leicht erhöhter Abschluss entsteht. Regelmäßigkeit, Elastizität und Sauberkeit des Stiches helfen bei der Beurteilung der Ausführung."
      },
      {
        "term": "Jacquard",
        "short": "Webtechnik, bei der das Muster direkt in die Webart des Stoffes integriert wird.",
        "long": "Der Webstuhl steuert Gruppen von Kettfäden separat und ermöglicht so komplexe Designs. Das Muster wird nicht auf die Oberfläche aufgetragen, sondern entsteht durch die Struktur des Stoffes selbst."
      },
      {
        "term": "Köperbindung",
        "short": "Eine Bindung, erkennbar an dünnen diagonalen Linien auf der Oberfläche.",
        "long": "Die diagonale Struktur bietet eine gute Balance zwischen Fließfähigkeit, Substanz und Strapazierfähigkeit. Aus diesem Grund wird Twill häufig in Seidenschals und Accessoires für den täglichen Gebrauch verwendet."
      },
      {
        "term": "Satinbindung",
        "short": "Bindung mit glatter und glänzender Oberfläche, mit wenigen sichtbaren Webpunkten.",
        "long": "Die Fäden bleiben länger an der Oberfläche sichtbar und reflektieren das Licht gleichmäßig. Satin hat einen fließenden Griff, erfordert jedoch möglicherweise mehr Aufmerksamkeit gegen herausgezogene Fäden und Abrieb."
      },
      {
        "term": "Kette und Schuss",
        "short": "Die beiden Fadensysteme, die sich kreuzen, um einen Stoff zu bilden.",
        "long": "Die Kette verläuft in Längsrichtung und wird auf dem Webstuhl gespannt; Der Schussfaden verläuft in der Breite durch ihn hindurch. Ihr Verhältnis bestimmt Struktur, Kompaktheit, Gewicht und Fall."
      },
      {
        "term": "Mikron (μm)",
        "short": "Einheit zur Angabe des durchschnittlichen Durchmessers einer Faser.",
        "long": "Ein niedrigerer Wert beschreibt eine feinere Faser, reicht jedoch allein nicht aus, um Qualität zu definieren. Faserlänge, Gleichmäßigkeit, Festigkeit, Auswahl und Verarbeitung beeinflussen das Endergebnis."
      },
      {
        "term": "GSM",
        "short": "Gramm pro Quadratmeter: Misst das Oberflächengewicht eines Stoffes.",
        "long": "GSM hilft beim Vergleich von Dichte und Gewicht, ist jedoch keine Qualitätsbewertung. Zwei Stoffe mit demselben Wert können je nach Faser, Garn, Webart und Ausrüstung unterschiedliche Haptik und Leistung haben."
      },
      {
        "term": "Denier",
        "short": "Einheit, die die Masse von 9.000 Metern Garn in Gramm ausdrückt.",
        "long": "Bei gleichem Material entspricht ein niedrigerer Wert im Allgemeinen einem feineren Garn. Die Leistung des Stoffes hängt jedoch auch von Drehung, Dichte und Konstruktion ab."
      },
      {
        "term": "Garn",
        "short": "Endlosfaden, der durch Verbinden oder Verdrehen von Textilfasern entsteht.",
        "long": "Garn ist der Übergang zwischen Faser und Stoff. Garnfeinheit, Drehung, Regelmäßigkeit und Art der Fasern bestimmen die Weichheit, Widerstandsfähigkeit, den Glanz und das Aussehen des Endprodukts."
      },
      {
        "term": "Pashmina",
        "short": "Historischer Begriff im Zusammenhang mit feinen Fasern aus dem Himalaya-Gebiet, heute auch zur Bezeichnung einer breiten Stola verwendet.",
        "long": "Im zeitgenössischen Handel kann das Wort Form und Stil beschreiben, nicht unbedingt die Zusammensetzung. Um herauszufinden, ob ein Pashmina aus Kaschmir, Wolle oder einer Mischung besteht, ist es wichtig, das Etikett zu überprüfen."
      },
      {
        "term": "Foulard",
        "short": "Leichtes Accessoire, oft quadratisch, um den Hals, im Haar oder an einer Tasche getragen.",
        "long": "Es kann aus Seide oder anderen Materialien und in vielen Größen hergestellt werden. Zusammensetzung, Webart, Druck und Art des Saums bestimmen die Haptik, den Fall und die Pflege."
      },
      {
        "term": "Textilveredelung",
        "short": "Eine Reihe abschließender Behandlungen, die den Griff, das Aussehen und das Verhalten des Stoffes definieren.",
        "long": "Waschen, Dämpfen, Kalandrieren und andere Prozesse können die Weichheit, den Glanz, die Stabilität und die Farbwiedergabe verändern. Der richtige Zyklus hängt von der Faser und dem gewünschten Ergebnis ab."
      }
    ],
    "metaTitle": "Textilglossar – Seide, Kaschmir und Weberei",
    "metaDescription": "Klare Definitionen der wichtigsten Textilbegriffe: Como-Seide, Roulette, Jacquard, Twill, Micron, GSM, Garn und Veredelung.",
    "schemaName": "SILKinCOM Textilglossar",
    "breadcrumb": "Glossar",
    "eyebrow": "Textiles Wissen",
    "h1Start": "Textil",
    "h1Emphasis": "glossar",
    "intro": "Die wichtigsten Begriffe rund um Seide, Kaschmir und Weberei – klar erklärt, damit Sie Etiketten lesen und bewusst auswählen können.",
    "index": "Index",
    "questionTemplate": "Was ist {term}?",
    "ctaPrompt": "Möchten Sie tiefer in die Textilkultur von Como eintauchen?",
    "ctaHistory": "Geschichte der Seide in Como",
    "ctaAuthenticity": "Echte Seide erkennen"
  },
  "pt": {
    "terms": [
      {
        "term": "Seda de Como",
        "short": "Seda desenhada, tecida, estampada ou acabada no distrito têxtil de Como.",
        "long": "A expressão descreve a tradição fabril da província de Como. Não indica necessariamente a origem italiana da fibra bruta: para avaliar um produto é necessário ler a composição, origem e processamento declarados pelo fabricante."
      },
      {
        "term": "Rouletté",
        "short": "Bainha enrolada, tradicionalmente feita à mão em lenços de seda.",
        "long": "A borda é dobrada e enrolada com pequenos pontos, criando um acabamento macio e levemente elevado. Regularidade, elasticidade e limpeza do ponto ajudam a avaliar a execução."
      },
      {
        "term": "Jacquard",
        "short": "Técnica de tecelagem que constrói o padrão diretamente na trama do tecido.",
        "long": "O tear controla grupos de fios de urdidura separadamente, possibilitando projetos complexos. O padrão não é aplicado na superfície: ele surge da própria estrutura do tecido."
      },
      {
        "term": "Twill (sarja)",
        "short": "Armadura reconhecível por finas linhas diagonais na superfície.",
        "long": "A estrutura diagonal oferece um bom equilíbrio entre fluidez, corpo e resistência. Por esse motivo, a sarja é frequentemente utilizada em lenços de seda e acessórios de uso diário."
      },
      {
        "term": "Cetim",
        "short": "Armadura com superfície lisa e brilhante, com poucos pontos de trama visíveis.",
        "long": "Os fios permanecem expostos na superfície por mais tempo e refletem a luz de maneira uniforme. O cetim tem um toque suave, mas pode exigir mais atenção contra fios puxados e abrasões."
      },
      {
        "term": "Urdidura e trama",
        "short": "Os dois sistemas de fios que se cruzam para formar um tecido.",
        "long": "A urdidura corre longitudinalmente e é esticada no tear; a trama passa por ela na largura. A sua relação determina estrutura, compacidade, peso e caimento."
      },
      {
        "term": "Mícron (μm)",
        "short": "Unidade utilizada para indicar o diâmetro médio de uma fibra.",
        "long": "Um valor mais baixo descreve uma fibra mais fina, mas não é suficiente por si só para definir a qualidade. O comprimento, uniformidade, resistência, seleção e processamento da fibra influenciam o resultado final."
      },
      {
        "term": "GSM",
        "short": "Gramas por metro quadrado: mede o peso superficial de um tecido.",
        "long": "O GSM ajuda a comparar densidade e peso, mas não é uma classificação de qualidade. Dois tecidos com o mesmo valor podem ter toque e desempenho diferentes com base na fibra, fio, trama e acabamento."
      },
      {
        "term": "Denier",
        "short": "Unidade que expressa a massa em gramas de 9.000 metros de fio.",
        "long": "Para o mesmo material, um valor inferior corresponde geralmente a um fio mais fino. No entanto, o desempenho do tecido também depende da torção, da densidade e da construção."
      },
      {
        "term": "Fio têxtil",
        "short": "Fio contínuo obtido pela união ou torção de fibras têxteis.",
        "long": "O fio é a transição entre fibra e tecido. A contagem, torção, regularidade e tipo de fibra contribuem para definir a maciez, resistência, brilho e aparência do produto acabado."
      },
      {
        "term": "Pashmina",
        "short": "Termo histórico ligado às fibras finas da região do Himalaia, hoje também utilizado para indicar uma estola larga.",
        "long": "No comércio contemporâneo, a palavra pode descrever a forma e estilo, não necessariamente composição. Para saber se uma pashmina é feita de caxemira, lã ou mistura, é fundamental verificar o rótulo."
      },
      {
        "term": "Foulard",
        "short": "Acessório leve, muitas vezes quadrado, usado no pescoço, no cabelo ou na bolsa.",
        "long": "Pode ser feito de seda ou outros materiais e em vários tamanhos. A composição, a trama, a estampa e o tipo de bainha determinam seu toque, caimento e métodos de cuidado."
      },
      {
        "term": "Acabamento têxtil",
        "short": "Conjunto de tratamentos finais que definem o toque, aparência e comportamento do tecido.",
        "long": "Lavagem, vaporização, calandragem e outros processos podem alterar a maciez, o brilho, a estabilidade e a reprodução de cores. O ciclo correto depende da fibra e do resultado desejado."
      }
    ],
    "metaTitle": "Glossário têxtil — Seda, caxemira e tecelagem",
    "metaDescription": "Definições claras dos principais termos têxteis: seda Como, roleta, jacquard, sarja, mícron, GSM, fio e acabamento.",
    "schemaName": "Glossário Têxtil SILKinCOM",
    "breadcrumb": "Glossário",
    "eyebrow": "Conhecimento têxtil",
    "h1Start": "Glossário",
    "h1Emphasis": "têxtil",
    "intro": "Os termos essenciais da seda, da caxemira e da tecelagem, explicados com clareza para ler uma etiqueta e escolher com maior consciência.",
    "index": "Índice",
    "questionTemplate": "O que é {term}?",
    "ctaPrompt": "Quer se aprofundar na cultura têxtil de Como?",
    "ctaHistory": "História da seda em Como",
    "ctaAuthenticity": "Como reconhecer seda autêntica"
  },
  "nl": {
    "terms": [
      {
        "term": "Zijde uit Como",
        "short": "Zijde ontworpen, geweven, bedrukt of afgewerkt in de textielwijk Como.",
        "long": "De uitdrukking beschrijft de productietraditie van de provincie Como. Het geeft niet noodzakelijkerwijs de Italiaanse oorsprong van de ruwe vezel aan: om een ​​product te beoordelen is het noodzakelijk om de samenstelling, oorsprong en verwerking te lezen die door de fabrikant zijn aangegeven."
      },
      {
        "term": "Rouletté",
        "short": "Rolzoom, traditioneel handgemaakt op zijden sjaals.",
        "long": "De rand is gevouwen en opgerold met kleine steken, waardoor een zachte, licht verhoogde afwerking ontstaat. Regelmaat, elasticiteit en netheid van de steek helpen de uitvoering te evalueren."
      },
      {
        "term": "Jacquard",
        "short": "Weeftechniek waarbij het patroon rechtstreeks in het weefsel van de stof wordt ingebouwd.",
        "long": "Het weefgetouw bestuurt groepen kettingdraden afzonderlijk, waardoor complexe ontwerpen mogelijk zijn. Het patroon wordt niet op het oppervlak aangebracht: het komt voort uit de structuur van de stof zelf."
      },
      {
        "term": "Keperbinding",
        "short": "Een binding, herkenbaar aan dunne diagonale lijnen op het oppervlak.",
        "long": "De diagonale structuur biedt een goede balans tussen souplesse, body en slijtvastheid. Om deze reden wordt twill vaak gebruikt in zijden sjaals en accessoires bedoeld voor dagelijks gebruik."
      },
      {
        "term": "Satijnbinding",
        "short": "Binding met een glad en helder oppervlak, met weinig zichtbare weefpunten.",
        "long": "De draden blijven langer zichtbaar op het oppervlak en reflecteren het licht gelijkmatig. Satijn voelt soepel aan, maar vereist mogelijk meer aandacht tegen getrokken draden en schaafwonden."
      },
      {
        "term": "Schering en inslag",
        "short": "De twee systemen van draden die elkaar kruisen om een ​​stof te vormen.",
        "long": "De ketting loopt in de lengte en wordt op het weefgetouw gespannen; de inslag gaat er in de breedte doorheen. Hun relatie bepaalt structuur, compactheid, gewicht en drapering."
      },
      {
        "term": "Micron (μm)",
        "short": "Eenheid die wordt gebruikt om de gemiddelde diameter van een vezel aan te geven.",
        "long": "Een lagere waarde beschrijft een fijnere vezel, maar is op zichzelf niet voldoende om de kwaliteit te definiëren. Vezellengte, uniformiteit, sterkte, selectie en verwerking beïnvloeden het eindresultaat."
      },
      {
        "term": "GSM",
        "short": "Gram per vierkante meter: meet het oppervlaktegewicht van een stof.",
        "long": "GSM helpt bij het vergelijken van dichtheid en gewicht, maar is geen kwaliteitsbeoordeling. Twee stoffen met dezelfde waarde kunnen een verschillend gevoel en prestatie hebben op basis van vezels, garen, weefsel en afwerking."
      },
      {
        "term": "Denier",
        "short": "Eenheid die de massa uitdrukt in grammen van 9.000 meter garen.",
        "long": "Voor hetzelfde materiaal komt een lagere waarde doorgaans overeen met een fijner garen. De prestaties van de stof zijn echter ook afhankelijk van de draaiing, dichtheid en constructie."
      },
      {
        "term": "Garen",
        "short": "Doorlopende draad verkregen door het samenvoegen of draaien van textielvezels.",
        "long": "Garen is de overgang tussen vezel en stof. Garendikte, twist, regelmaat en type vezel dragen bij aan het definiëren van de zachtheid, weerstand, glans en uiterlijk van het eindproduct."
      },
      {
        "term": "Pashmina",
        "short": "Historische term gekoppeld aan fijne vezels uit het Himalaya-gebied, tegenwoordig ook gebruikt om een ​​brede stola aan te duiden.",
        "long": "In de hedendaagse handel kan het woord vorm en stijl beschrijven, niet noodzakelijk de samenstelling. Om erachter te komen of een pashmina van kasjmier, wol of een mix is ​​gemaakt, is het essentieel om het etiket te controleren."
      },
      {
        "term": "Foulard",
        "short": "Lichtgewicht accessoire, vaak vierkant, gedragen om de nek, in het haar of aan een tas.",
        "long": "Het kan gemaakt zijn van zijde of andere materialen en in vele maten. Samenstelling, weefsel, print en type zoom bepalen het gevoel, de val en de verzorgingsmethoden."
      },
      {
        "term": "Textielafwerking",
        "short": "Een reeks eindbehandelingen die de het gevoel, het uiterlijk en het gedrag van de stof bepalen.",
        "long": "Wassen, stomen, kalanderen en andere processen kunnen de zachtheid, glans, stabiliteit en kleurweergave veranderen. De juiste cyclus is afhankelijk van de vezel en het gewenste resultaat."
      }
    ],
    "metaTitle": "Textielwoordenlijst — Zijde, kasjmier en weven",
    "metaDescription": "Duidelijke definities van de belangrijkste textieltermen: Como-zijde, roulette, jacquard, twill, micron, GSM, garen en afwerking.",
    "schemaName": "SILKinCOM Textielwoordenlijst",
    "breadcrumb": "Glossarium",
    "eyebrow": "Textielkennis",
    "h1Start": "Textiel",
    "h1Emphasis": "woordenlijst",
    "intro": "De belangrijkste termen uit zijde, kasjmier en weven, helder uitgelegd zodat u een etiket kunt lezen en bewuster kunt kiezen.",
    "index": "Index",
    "questionTemplate": "Wat is {term}?",
    "ctaPrompt": "Ontdek de textielcultuur van Como.",
    "ctaHistory": "Geschiedenis van zijde in Como",
    "ctaAuthenticity": "Echte zijde herkennen"
  }
} satisfies Record<string, GlossaryContent>;

export function getGlossaryContent(locale: string): GlossaryContent {
  return GLOSSARY_CONTENT[locale as keyof typeof GLOSSARY_CONTENT] ?? GLOSSARY_CONTENT.it;
}
