#!/usr/bin/env python3
"""Generate migration 031 — fill description_long_i18n for all products.

Italian descriptions were cleaned in migrations 028-030 + the darsena/lario/
melzi pass. description_long_i18n was empty everywhere, so non-Italian
storefronts fell back to the legacy products.json dump. This migration writes
human-quality translations (en/es/fr/de/pt/nl) straight into the DB.
"""

def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"

def i18n_obj(t: dict) -> str:
    parts = [f"{sql_str(k)}, {sql_str(t[k])}" for k in ('en', 'es', 'fr', 'de', 'pt', 'nl')]
    return "jsonb_build_object(" + ", ".join(parts) + ")"

# ---- darsena: clean IT description_long (templated by colour) ----
DARSENA_CLASSIC_IT = (
    "Il cappellino Darsena {col} è un berretto baseball unisex in 100% cotone, con struttura "
    "classica a sei pannelli, visiera curva preformata e logo Lago di Como ricamato {logo} a "
    "contrasto. Un accessorio Made in Italy pensato per l'uso quotidiano, dal design essenziale e "
    "versatile. Realizzato interamente in cotone naturale di alta qualità, il cappellino Darsena "
    "nella tonalità {col} unisce una linea pulita a una vestibilità stabile e naturale. La struttura "
    "a sei pannelli mantiene la forma definita nel tempo, mentre la fascetta regolabile garantisce "
    "una calzata su misura per ogni testa. Il cotone naturale assicura traspirabilità e una "
    "sensazione di freschezza costante, rendendolo adatto sia alle giornate di sole sia all'uso "
    "urbano di tutti i giorni. Il logo Lago di Como ricamato a contrasto, ispirato alla silhouette "
    "del lario, rifinisce il fronte con un dettaglio distintivo del marchio. Cura: lavaggio a mano "
    "in acqua fredda, asciugatura all'aria mantenendo la forma."
)
DARSENA_TRUCKER_IT = (
    "Il cappellino Darsena {col} è un berretto baseball unisex in stile trucker, con frontale "
    "strutturato in 100% cotone, pannello posteriore in rete di poliestere traspirante, visiera "
    "curva preformata e logo Lago di Como ricamato {logo} a contrasto. Un accessorio Made in Italy "
    "pensato per le giornate più calde, per chi cerca massima aerazione e una calzata leggera. La "
    "variante Darsena in stile trucker è progettata per chi cerca la massima aerazione. Il frontale "
    "è realizzato in cotone resistente, mentre la parte posteriore è composta da una rete in "
    "poliestere che garantisce un flusso d'aria continuo, ideale per le giornate più calde o per le "
    "attività all'aperto. Un modello che coniuga la robustezza frontale con la leggerezza tecnica "
    "della rete."
)

# colour words per language ("in <x>" form — grammatically invariant)
COL = {
    'bianco': dict(it='bianco', en='white', es='blanco', fr='blanc', de='Weiß', pt='branco', nl='wit'),
    'navy':   dict(it='blu navy', en='navy blue', es='azul marino', fr='bleu marine', de='Marineblau', pt='azul-marinho', nl='marineblauw'),
    'nero':   dict(it='nero', en='black', es='negro', fr='noir', de='Schwarz', pt='preto', nl='zwart'),
    'blu':    dict(it='blu', en='blue', es='azul', fr='bleu', de='Blau', pt='azul', nl='blauw'),
    'verde':  dict(it='verde', en='green', es='verde', fr='vert', de='Grün', pt='verde', nl='groen'),
}

DARSENA_CLASSIC_TMPL = {
    'en': ("The Darsena cap in {col} is a unisex 100% cotton baseball cap, with a classic six-panel "
           "structure, a pre-curved peak and a Lake Como logo embroidered in contrasting {logo}. A "
           "Made in Italy accessory designed for everyday wear, with an essential, versatile design. "
           "Made entirely from high-quality natural cotton, the Darsena cap in {col} pairs a clean "
           "line with a stable, natural fit. The six-panel structure keeps its defined shape over "
           "time, while the adjustable strap ensures a tailored fit for every head. Natural cotton "
           "ensures breathability and a constant sense of freshness, making it suited to sunny days "
           "and everyday city wear alike. The contrasting Lake Como logo, inspired by the silhouette "
           "of the lake, finishes the front with a distinctive brand detail. Care: hand wash in cold "
           "water, air dry while keeping its shape."),
    'es': ("La gorra Darsena en {col} es una gorra de béisbol unisex de 100% algodón, con estructura "
           "clásica de seis paneles, visera curva preformada y logo del Lago de Como bordado en "
           "{logo} a contraste. Un accesorio Made in Italy pensado para el uso diario, de diseño "
           "esencial y versátil. Realizada íntegramente en algodón natural de alta calidad, la gorra "
           "Darsena en {col} une una línea limpia a un ajuste estable y natural. La estructura de "
           "seis paneles mantiene su forma definida con el tiempo, mientras que la correa regulable "
           "garantiza un ajuste a medida para cada cabeza. El algodón natural asegura "
           "transpirabilidad y una sensación de frescura constante, lo que la hace adecuada tanto "
           "para los días de sol como para el uso urbano cotidiano. El logo del Lago de Como bordado "
           "a contraste, inspirado en la silueta del lago, remata el frente con un detalle "
           "distintivo de la marca. Cuidado: lavar a mano en agua fría, secar al aire conservando la "
           "forma."),
    'fr': ("La casquette Darsena en {col} est une casquette de baseball unisexe en 100% coton, dotée "
           "d'une structure classique à six panneaux, d'une visière courbée préformée et d'un logo "
           "lac de Côme brodé en {logo} contrastant. Un accessoire Made in Italy pensé pour un usage "
           "quotidien, au design épuré et polyvalent. Entièrement réalisée en coton naturel de haute "
           "qualité, la casquette Darsena en {col} allie une ligne nette à une tenue stable et "
           "naturelle. La structure à six panneaux conserve sa forme définie dans le temps, tandis "
           "que la bande réglable assure un ajustement sur mesure pour chaque tête. Le coton naturel "
           "garantit respirabilité et une sensation de fraîcheur constante, ce qui la rend adaptée "
           "aussi bien aux journées ensoleillées qu'à un usage urbain quotidien. Le logo lac de Côme "
           "brodé en contraste, inspiré de la silhouette du lac, achève le devant d'un détail "
           "distinctif de la marque. Entretien : lavage à la main à l'eau froide, séchage à l'air en "
           "conservant la forme."),
    'de': ("Die Darsena-Cap in {col} ist eine Unisex-Baseballcap aus 100% Baumwolle, mit klassischer "
           "Sechs-Panel-Struktur, vorgeformtem geschwungenem Schirm und einem kontrastierend in "
           "{logo} gestickten Comer-See-Logo. Ein Accessoire Made in Italy für den täglichen "
           "Gebrauch, mit reduziertem, vielseitigem Design. Vollständig aus hochwertiger "
           "Naturbaumwolle gefertigt, verbindet die Darsena-Cap in {col} eine klare Linie mit einem "
           "stabilen, natürlichen Sitz. Die Sechs-Panel-Struktur behält ihre definierte Form über "
           "die Zeit, während das verstellbare Band einen maßgeschneiderten Sitz für jeden Kopf "
           "gewährleistet. Naturbaumwolle sorgt für Atmungsaktivität und ein konstantes "
           "Frischegefühl und macht sie für sonnige Tage ebenso geeignet wie für den urbanen Alltag. "
           "Das kontrastierend gestickte Comer-See-Logo, inspiriert von der Silhouette des Sees, "
           "vollendet die Vorderseite mit einem markanten Markendetail. Pflege: Handwäsche in kaltem "
           "Wasser, an der Luft trocknen und dabei die Form bewahren."),
    'pt': ("O boné Darsena em {col} é um boné de basebol unissexo em 100% algodão, com estrutura "
           "clássica de seis painéis, pala curva pré-formada e logótipo Lago de Como bordado em "
           "{logo} a contraste. Um acessório Made in Italy pensado para o uso diário, de design "
           "essencial e versátil. Realizado inteiramente em algodão natural de alta qualidade, o "
           "boné Darsena em {col} une uma linha limpa a um caimento estável e natural. A estrutura "
           "de seis painéis mantém a forma definida ao longo do tempo, enquanto a fita ajustável "
           "garante um ajuste à medida para cada cabeça. O algodão natural assegura respirabilidade "
           "e uma sensação de frescura constante, tornando-o adequado tanto para os dias de sol como "
           "para o uso urbano do dia a dia. O logótipo Lago de Como bordado a contraste, inspirado "
           "na silhueta do lago, remata a frente com um detalhe distintivo da marca. Cuidados: lavar "
           "à mão em água fria, secar ao ar mantendo a forma."),
    'nl': ("De Darsena pet in {col} is een uniseks baseballpet van 100% katoen, met een klassieke "
           "zespanelenstructuur, voorgevormde gebogen klep en een Comomeer-logo dat contrasterend in "
           "{logo} is geborduurd. Een Made in Italy accessoire voor dagelijks gebruik, met een "
           "essentieel en veelzijdig ontwerp. Volledig vervaardigd uit hoogwaardig natuurlijk katoen "
           "verenigt de Darsena pet in {col} een strakke lijn met een stabiele, natuurlijke "
           "pasvorm. De zespanelenstructuur behoudt zijn vaste vorm in de tijd, terwijl het "
           "verstelbare bandje voor elk hoofd een pasvorm op maat verzekert. Natuurlijk katoen zorgt "
           "voor ademend vermogen en een constant gevoel van frisheid, waardoor de pet geschikt is "
           "voor zowel zonnige dagen als dagelijks gebruik in de stad. Het contrasterend "
           "geborduurde Comomeer-logo, geïnspireerd op de silhouet van het meer, voltooit de "
           "voorzijde met een onderscheidend merkdetail. Onderhoud: handwas in koud water, aan de "
           "lucht drogen met behoud van de vorm."),
}
DARSENA_TRUCKER_TMPL = {
    'en': ("The Darsena cap in {col} is a unisex trucker-style baseball cap, with a structured 100% "
           "cotton front, a breathable polyester mesh back panel, a pre-curved peak and a Lake Como "
           "logo embroidered in contrasting {logo}. A Made in Italy accessory designed for warmer "
           "days, for those seeking maximum ventilation and a light fit. The trucker-style Darsena "
           "variant is built for maximum airflow: the front is made of sturdy cotton, while the back "
           "is a polyester mesh that ensures continuous air circulation, ideal for hot days or "
           "outdoor activities. A model that combines a robust front with the technical lightness of "
           "mesh."),
    'es': ("La gorra Darsena en {col} es una gorra de béisbol unisex de estilo trucker, con frente "
           "estructurado de 100% algodón, panel posterior de malla de poliéster transpirable, "
           "visera curva preformada y logo del Lago de Como bordado en {logo} a contraste. Un "
           "accesorio Made in Italy pensado para los días más cálidos, para quienes buscan la máxima "
           "aireación y un ajuste ligero. La variante Darsena de estilo trucker está diseñada para "
           "la máxima circulación de aire: el frente es de algodón resistente, mientras que la parte "
           "posterior es una malla de poliéster que garantiza un flujo de aire continuo, ideal para "
           "los días calurosos o las actividades al aire libre. Un modelo que combina la solidez del "
           "frente con la ligereza técnica de la malla."),
    'fr': ("La casquette Darsena en {col} est une casquette de baseball unisexe de style trucker, "
           "avec un devant structuré en 100% coton, un panneau arrière en filet de polyester "
           "respirant, une visière courbée préformée et un logo lac de Côme brodé en {logo} "
           "contrastant. Un accessoire Made in Italy pensé pour les journées les plus chaudes, pour "
           "qui recherche une aération maximale et une tenue légère. La variante Darsena de style "
           "trucker est conçue pour une circulation d'air maximale : le devant est en coton "
           "résistant, tandis que l'arrière est un filet de polyester qui assure un flux d'air "
           "continu, idéal pour les journées chaudes ou les activités en plein air. Un modèle qui "
           "allie la robustesse du devant à la légèreté technique du filet."),
    'de': ("Die Darsena-Cap in {col} ist eine Unisex-Baseballcap im Trucker-Stil, mit strukturierter "
           "Vorderseite aus 100% Baumwolle, atmungsaktivem Rückenpanel aus Polyester-Mesh, "
           "vorgeformtem geschwungenem Schirm und einem kontrastierend in {logo} gestickten "
           "Comer-See-Logo. Ein Accessoire Made in Italy für die wärmsten Tage, für alle, die "
           "maximale Belüftung und einen leichten Sitz suchen. Die Darsena-Variante im Trucker-Stil "
           "ist auf maximalen Luftstrom ausgelegt: Die Vorderseite besteht aus robuster Baumwolle, "
           "während die Rückseite ein Polyester-Mesh ist, das eine kontinuierliche Luftzirkulation "
           "gewährleistet – ideal für heiße Tage oder Aktivitäten im Freien. Ein Modell, das eine "
           "robuste Vorderseite mit der technischen Leichtigkeit des Mesh verbindet."),
    'pt': ("O boné Darsena em {col} é um boné de basebol unissexo de estilo trucker, com frente "
           "estruturada em 100% algodão, painel traseiro em rede de poliéster respirável, pala curva "
           "pré-formada e logótipo Lago de Como bordado em {logo} a contraste. Um acessório Made in "
           "Italy pensado para os dias mais quentes, para quem procura a máxima ventilação e um "
           "caimento leve. A variante Darsena de estilo trucker foi concebida para a máxima "
           "circulação de ar: a frente é em algodão resistente, enquanto a parte de trás é uma rede "
           "de poliéster que garante um fluxo de ar contínuo, ideal para os dias quentes ou as "
           "atividades ao ar livre. Um modelo que alia a robustez da frente à leveza técnica da "
           "rede."),
    'nl': ("De Darsena pet in {col} is een uniseks baseballpet in truckerstijl, met een "
           "gestructureerde voorzijde van 100% katoen, een ademend achterpaneel van polyester mesh, "
           "een voorgevormde gebogen klep en een Comomeer-logo dat contrasterend in {logo} is "
           "geborduurd. Een Made in Italy accessoire voor de warmste dagen, voor wie maximale "
           "ventilatie en een lichte pasvorm zoekt. De Darsena-variant in truckerstijl is gemaakt "
           "voor maximale luchtstroom: de voorzijde is van stevig katoen, terwijl de achterzijde een "
           "polyester mesh is die voor continue luchtcirculatie zorgt, ideaal voor warme dagen of "
           "activiteiten buiten. Een model dat een robuuste voorzijde combineert met de technische "
           "lichtheid van mesh."),
}

DARSENA = {
    'darsena-bianco': ('classic', 'bianco', 'navy'),
    'darsena-navy':   ('classic', 'navy', 'bianco'),
    'darsena-nero':   ('classic', 'nero', 'bianco'),
    'darsena-blu':    ('trucker', 'blu', 'bianco'),
    'darsena-verde':  ('trucker', 'verde', 'navy'),
}

# ---- como: one template per language, {N} = Italian line name ----
COMO_TMPL = {
    'en': ("The Como {N} twilly is a 100% Made in Italy silk accessory, inspired by the waves of "
           "Lake Como and defined by an exclusive jacquard pattern. Light, soft and luminous, it is "
           "the perfect silk twilly to enrich formal and casual looks alike. Versatile and refined, "
           "it can be worn around the neck, in the hair, as a slim foulard or as an elegant detail "
           "on bags and outfits. A must-have for those who love the quality of Como silk and "
           "timeless style."),
    'es': ("El twilly Como {N} es un accesorio de seda 100% Made in Italy, inspirado en las olas del "
           "Lago de Como y caracterizado por un exclusivo estampado jacquard. Ligero, suave y "
           "luminoso, es el twilly de seda perfecto para enriquecer looks formales e informales. "
           "Versátil y refinado, puede llevarse al cuello, en el cabello, como foulard estrecho o "
           "como elegante detalle en bolsos y conjuntos. Un imprescindible para quienes aman la "
           "calidad de la seda comasca y el estilo atemporal."),
    'fr': ("Le twilly Como {N} est un accessoire en soie 100% Made in Italy, inspiré des vagues du "
           "lac de Côme et orné d'un motif jacquard exclusif. Léger, doux et lumineux, c'est le "
           "twilly en soie idéal pour sublimer les tenues formelles comme décontractées. Polyvalent "
           "et raffiné, il se porte au cou, dans les cheveux, en foulard étroit ou comme détail "
           "élégant sur les sacs et les tenues. Un incontournable pour qui aime la qualité de la "
           "soie de Côme et le style intemporel."),
    'de': ("Das Como-{N}-Twilly ist ein Seidenaccessoire 100% Made in Italy, inspiriert von den "
           "Wellen des Comer Sees und geprägt von einem exklusiven Jacquard-Muster. Leicht, weich "
           "und leuchtend, ist es das perfekte Seiden-Twilly, um formelle wie lässige Looks zu "
           "bereichern. Vielseitig und raffiniert, lässt es sich um den Hals, im Haar, als schmales "
           "Tuch oder als elegantes Detail an Taschen und Outfits tragen. Ein Must-have für alle, "
           "die die Qualität der Comer Seide und zeitlosen Stil lieben."),
    'pt': ("O twilly Como {N} é um acessório em seda 100% Made in Italy, inspirado nas ondas do Lago "
           "de Como e caracterizado por um exclusivo padrão jacquard. Leve, suave e luminoso, é o "
           "twilly de seda perfeito para enriquecer looks formais e informais. Versátil e "
           "requintado, pode ser usado ao pescoço, no cabelo, como foulard estreito ou como elegante "
           "detalhe em malas e conjuntos. Um must-have para quem ama a qualidade da seda de Como e o "
           "estilo atemporal."),
    'nl': ("De Como {N} twilly is een zijden accessoire, 100% Made in Italy, geïnspireerd op de "
           "golven van het Comomeer en gekenmerkt door een exclusief jacquardmotief. Licht, zacht en "
           "glanzend is het de perfecte zijden twilly om formele en casual looks te verrijken. "
           "Veelzijdig en verfijnd kan hij rond de hals, in het haar, als smalle foulard of als "
           "elegant detail op tassen en outfits worden gedragen. Een must-have voor wie houdt van de "
           "kwaliteit van Comaanse zijde en tijdloze stijl."),
}
COMO = {
    'como': 'Essenziale', 'como-elegante': 'Elegante', 'como-fluido': 'Fluido',
    'como-leggero': 'Leggero', 'como-puro': 'Puro',
}

# ---- grouped translations (slug list -> 6-lang dict) ----
GROUPS = [
    (['bellagio', 'bellagio-3', 'bellagio-4', 'bellagio-5', 'bellagio-6'], {
        'en': "The Bellagio pashmina, in pure cashmere, combines lightness and softness in an accessory of natural allure. Inspired by Mediterranean elegance, it wraps you in discreet warmth and adds a touch of refinement to every look.",
        'es': "El chal Bellagio, en puro cachemir, combina ligereza y suavidad en un accesorio de encanto natural. Inspirado en la elegancia mediterránea, envuelve con un calor discreto y añade un toque de refinamiento a cualquier look.",
        'fr': "L'étole Bellagio, en pur cachemire, conjugue légèreté et douceur dans un accessoire au charme naturel. Inspirée de l'élégance méditerranéenne, elle enveloppe d'une chaleur discrète et ajoute une touche de raffinement à chaque tenue.",
        'de': "Das Bellagio-Tuch aus reinem Kaschmir vereint Leichtigkeit und Weichheit in einem Accessoire von natürlichem Charme. Inspiriert von mediterraner Eleganz, umhüllt es mit dezenter Wärme und verleiht jedem Look eine raffinierte Note.",
        'pt': "A pashmina Bellagio, em puro caxemira, combina leveza e suavidade num acessório de encanto natural. Inspirada na elegância mediterrânica, envolve com um calor discreto e acrescenta um toque de requinte a qualquer look.",
        'nl': "De Bellagio-pashmina van puur kasjmier verenigt lichtheid en zachtheid in een accessoire met een natuurlijke charme. Geïnspireerd op mediterrane elegantie omhult hij met discrete warmte en voegt een verfijnde toets toe aan elke look.",
    }),
    (['bellagio-1', 'bellagio-2'], {
        'en': "The Bellagio pashmina, in pure cashmere, combines lightness and softness in an accessory of natural allure. Inspired by the refined spirit of Lake Como, it wraps you in discreet warmth and adds a touch of elegance to every look.",
        'es': "El chal Bellagio, en puro cachemir, combina ligereza y suavidad en un accesorio de encanto natural. Inspirado en la distinción del Lago de Como, envuelve con un calor discreto y añade un toque de elegancia a cualquier look.",
        'fr': "L'étole Bellagio, en pur cachemire, conjugue légèreté et douceur dans un accessoire au charme naturel. Inspirée du raffinement du lac de Côme, elle enveloppe d'une chaleur discrète et ajoute une touche d'élégance à chaque tenue.",
        'de': "Das Bellagio-Tuch aus reinem Kaschmir vereint Leichtigkeit und Weichheit in einem Accessoire von natürlichem Charme. Inspiriert von der Finesse des Comer Sees, umhüllt es mit dezenter Wärme und verleiht jedem Look eine elegante Note.",
        'pt': "A pashmina Bellagio, em puro caxemira, combina leveza e suavidade num acessório de encanto natural. Inspirada no requinte do Lago de Como, envolve com um calor discreto e acrescenta um toque de elegância a qualquer look.",
        'nl': "De Bellagio-pashmina van puur kasjmier verenigt lichtheid en zachtheid in een accessoire met een natuurlijke charme. Geïnspireerd op de verfijning van het Comomeer omhult hij met discrete warmte en voegt een elegante toets toe aan elke look.",
    }),
    (['cernobbio-azzurra', 'cernobbio-beige', 'cernobbio-grigia'], {
        'en': "The Cernobbio scarf, in pure cashmere, captures all the softness and warmth of the finest fibres. Its essential design and supple texture make it the ideal companion for everyday, timeless elegance.",
        'es': "La bufanda Cernobbio, en puro cachemir, reúne toda la suavidad y el calor de las fibras más nobles. Su diseño esencial y su textura mullida la convierten en la aliada ideal para una elegancia cotidiana y atemporal.",
        'fr': "L'écharpe Cernobbio, en pur cachemire, réunit toute la douceur et la chaleur des fibres les plus nobles. Son design épuré et sa texture moelleuse en font l'alliée idéale d'une élégance quotidienne et intemporelle.",
        'de': "Der Cernobbio-Schal aus reinem Kaschmir vereint die ganze Weichheit und Wärme edelster Fasern. Sein reduziertes Design und die weiche Textur machen ihn zum idealen Begleiter für eine alltägliche, zeitlose Eleganz.",
        'pt': "O cachecol Cernobbio, em puro caxemira, reúne toda a suavidade e o calor das fibras mais nobres. O seu design essencial e a textura macia tornam-no o aliado ideal para uma elegância quotidiana e atemporal.",
        'nl': "De Cernobbio-sjaal van puur kasjmier verenigt alle zachtheid en warmte van de edelste vezels. Het essentiële ontwerp en de zachte textuur maken hem tot de ideale metgezel voor een alledaagse, tijdloze elegantie.",
    }),
    (['lario', 'lario-1'], {
        'en': "The Lario T-shirt offers a fluid, carefully judged fit. Made from a fabric of 95% cotton and 5% elastane, it combines the natural softness of cotton with the body-adapting stretch of elastane, ensuring freedom of movement and a shape that stays unaltered over time. An essential piece, built with attention to detail to meet a need for everyday comfort and clean aesthetics.",
        'es': "La camiseta Lario ofrece un ajuste fluido y cuidado. Confeccionada en un tejido de 95% algodón y 5% elastano, une la suavidad natural del algodón a la capacidad de adaptarse a las formas que aporta el elastano, garantizando libertad de movimiento y una forma que permanece inalterada con el tiempo. Una prenda esencial, construida con atención al detalle para responder a una exigencia de comodidad diaria y pulcritud estética.",
        'fr': "Le t-shirt Lario offre une coupe fluide et soignée. Réalisé dans un tissu composé de 95% coton et 5% élasthanne, il unit la douceur naturelle du coton à la capacité d'épouser les formes offerte par l'élasthanne, garantissant une liberté de mouvement et une forme qui demeure inaltérée dans le temps. Une pièce essentielle, construite avec un soin du détail pour répondre à un besoin de confort quotidien et de pureté esthétique.",
        'de': "Das Lario-T-Shirt bietet eine fließende, sorgfältige Passform. Aus einem Gewebe aus 95% Baumwolle und 5% Elasthan gefertigt, verbindet es die natürliche Weichheit der Baumwolle mit der formanpassenden Dehnbarkeit des Elasthans und gewährleistet Bewegungsfreiheit und eine Form, die über die Zeit unverändert bleibt. Ein essenzielles Kleidungsstück, mit Liebe zum Detail gefertigt, um dem Bedürfnis nach täglichem Komfort und ästhetischer Klarheit gerecht zu werden.",
        'pt': "A t-shirt Lario oferece um caimento fluido e cuidado. Confecionada num tecido de 95% algodão e 5% elastano, une a suavidade natural do algodão à capacidade de adaptação às formas conferida pelo elastano, garantindo liberdade de movimento e uma forma que permanece inalterada ao longo do tempo. Uma peça essencial, construída com atenção ao detalhe para responder a uma exigência de conforto diário e pureza estética.",
        'nl': "Het Lario T-shirt biedt een vloeiende, verzorgde pasvorm. Vervaardigd uit een stof van 95% katoen en 5% elastaan verenigt het de natuurlijke zachtheid van katoen met het lichaamsvolgende rekvermogen van elastaan, wat bewegingsvrijheid garandeert en een vorm die in de tijd onveranderd blijft. Een essentieel kledingstuk, met oog voor detail gemaakt om te beantwoorden aan een behoefte aan dagelijks comfort en esthetische zuiverheid.",
    }),
    (['lario-2', 'lario-3', 'lario-4', 'lario-5', 'lario-6'], {
        'en': "The Lario T-shirt offers a fluid, carefully judged fit. Made from 100% cotton fabric, it combines the natural softness of cotton with a comfortable fit, ensuring freedom of movement and a shape that stays unaltered over time. An essential piece, built with attention to detail to meet a need for everyday comfort and clean aesthetics.",
        'es': "La camiseta Lario ofrece un ajuste fluido y cuidado. Confeccionada en un tejido 100% algodón, une la suavidad natural del algodón a un ajuste confortable, garantizando libertad de movimiento y una forma que permanece inalterada con el tiempo. Una prenda esencial, construida con atención al detalle para responder a una exigencia de comodidad diaria y pulcritud estética.",
        'fr': "Le t-shirt Lario offre une coupe fluide et soignée. Réalisé dans un tissu 100% coton, il unit la douceur naturelle du coton à une coupe confortable, garantissant une liberté de mouvement et une forme qui demeure inaltérée dans le temps. Une pièce essentielle, construite avec un soin du détail pour répondre à un besoin de confort quotidien et de pureté esthétique.",
        'de': "Das Lario-T-Shirt bietet eine fließende, sorgfältige Passform. Aus einem Gewebe aus 100% Baumwolle gefertigt, verbindet es die natürliche Weichheit der Baumwolle mit einer komfortablen Passform und gewährleistet Bewegungsfreiheit und eine Form, die über die Zeit unverändert bleibt. Ein essenzielles Kleidungsstück, mit Liebe zum Detail gefertigt, um dem Bedürfnis nach täglichem Komfort und ästhetischer Klarheit gerecht zu werden.",
        'pt': "A t-shirt Lario oferece um caimento fluido e cuidado. Confecionada num tecido 100% algodão, une a suavidade natural do algodão a um caimento confortável, garantindo liberdade de movimento e uma forma que permanece inalterada ao longo do tempo. Uma peça essencial, construída com atenção ao detalhe para responder a uma exigência de conforto diário e pureza estética.",
        'nl': "Het Lario T-shirt biedt een vloeiende, verzorgde pasvorm. Vervaardigd uit een stof van 100% katoen verenigt het de natuurlijke zachtheid van katoen met een comfortabele pasvorm, wat bewegingsvrijheid garandeert en een vorm die in de tijd onveranderd blijft. Een essentieel kledingstuk, met oog voor detail gemaakt om te beantwoorden aan een behoefte aan dagelijks comfort en esthetische zuiverheid.",
    }),
    (['melzi', 'melzi-1'], {
        'en': "The Melzi shorts interpret summer comfort through the purity of 100% linen. The fibre, chosen for its natural breathability and freshness, offers a fit that adapts effortlessly to moments of relaxation. The craftsmanship cares for every aspect, from the choice of materials to the construction, ensuring a light, well-defined garment that keeps its character over time.",
        'es': "El pantalón corto Melzi interpreta el confort estival a través de la pureza del 100% lino. La fibra, elegida por su transpirabilidad y frescura naturales, ofrece un ajuste que se adapta con soltura a los momentos de relax. La elaboración cuida cada aspecto, desde la elección de los materiales hasta la construcción, garantizando una prenda ligera y definida que conserva su carácter con el tiempo.",
        'fr': "Le short Melzi interprète le confort estival à travers la pureté du 100% lin. La fibre, choisie pour sa respirabilité et sa fraîcheur naturelles, offre une coupe qui s'adapte avec aisance aux moments de détente. La fabrication soigne chaque aspect, du choix des matières à la construction, garantissant une pièce légère et définie qui conserve son caractère dans le temps.",
        'de': "Die Melzi-Shorts interpretieren sommerlichen Komfort durch die Reinheit von 100% Leinen. Die Faser, gewählt für ihre natürliche Atmungsaktivität und Frische, bietet eine Passform, die sich mühelos an entspannte Momente anpasst. Die Verarbeitung achtet auf jedes Detail, von der Materialwahl bis zur Konstruktion, und gewährleistet ein leichtes, definiertes Kleidungsstück, das seinen Charakter über die Zeit bewahrt.",
        'pt': "Os calções Melzi interpretam o conforto estival através da pureza do 100% linho. A fibra, escolhida pela sua respirabilidade e frescura naturais, oferece um caimento que se adapta com desenvoltura aos momentos de descontração. A confeção cuida de cada aspeto, da escolha dos materiais à construção, garantindo uma peça leve e definida que mantém o seu carácter ao longo do tempo.",
        'nl': "De Melzi short vertaalt zomers comfort via de zuiverheid van 100% linnen. De vezel, gekozen om zijn natuurlijke ademend vermogen en frisheid, biedt een pasvorm die zich moeiteloos aanpast aan momenten van ontspanning. Het vakmanschap verzorgt elk aspect, van de materiaalkeuze tot de constructie, en garandeert een licht en strak gedefinieerd kledingstuk dat zijn karakter in de tijd behoudt.",
    }),
    (['riva', 'riva-1'], {
        'en': "The Riva shirt strikes a refined balance between natural fibre and structure. The blend of 53% linen and 47% cotton unites the characteristic freshness of linen with the soft hand and resilience of cotton, offering a comfortable fit and a surface that holds its shape naturally. A garment designed for everyday wear, carefully detailed in its construction to ensure elegance and breathability.",
        'es': "La camisa Riva propone un equilibrio refinado entre fibra natural y estructura. La mezcla de 53% lino y 47% algodón une la frescura característica del lino al tacto suave y la resistencia del algodón, ofreciendo un ajuste confortable y una superficie que mantiene la forma con naturalidad. Una prenda pensada para el uso diario, cuidada en los detalles de construcción para garantizar elegancia y transpirabilidad.",
        'fr': "La chemise Riva propose un équilibre raffiné entre fibre naturelle et structure. Le mélange de 53% lin et 47% coton unit la fraîcheur caractéristique du lin au toucher doux et à la résistance du coton, offrant une coupe confortable et une surface qui conserve sa forme avec naturel. Une pièce pensée pour un usage quotidien, soignée dans ses détails de construction pour garantir élégance et respirabilité.",
        'de': "Das Riva-Hemd schafft eine raffinierte Balance zwischen Naturfaser und Struktur. Die Mischung aus 53% Leinen und 47% Baumwolle verbindet die charakteristische Frische des Leinens mit dem weichen Griff und der Widerstandsfähigkeit der Baumwolle und bietet eine komfortable Passform sowie eine Oberfläche, die ihre Form natürlich bewahrt. Ein Kleidungsstück für den täglichen Gebrauch, sorgfältig in seinen konstruktiven Details, um Eleganz und Atmungsaktivität zu gewährleisten.",
        'pt': "A camisa Riva propõe um equilíbrio requintado entre fibra natural e estrutura. A mistura de 53% linho e 47% algodão une a frescura característica do linho ao toque suave e à resistência do algodão, oferecendo um caimento confortável e uma superfície que mantém a forma com naturalidade. Uma peça pensada para o uso diário, cuidada nos detalhes de construção para garantir elegância e respirabilidade.",
        'nl': "Het Riva-overhemd biedt een verfijnd evenwicht tussen natuurlijke vezel en structuur. De mix van 53% linnen en 47% katoen verenigt de kenmerkende frisheid van linnen met de zachte greep en de stevigheid van katoen, wat een comfortabele pasvorm oplevert en een oppervlak dat zijn vorm vanzelfsprekend behoudt. Een kledingstuk bedoeld voor dagelijks gebruik, verzorgd in de constructiedetails om elegantie en ademend vermogen te garanderen.",
    }),
    (['tivan'], {
        'en': "The Tivan beach towel is made to offer a natural answer to the search for quality and practicality. The choice of 100% cotton ensures optimal moisture management, guaranteeing effective drying and a constant sense of freshness on the skin, ideal for relaxing outdoors.",
        'es': "La toalla de playa Tivan está realizada para ofrecer una respuesta natural a la búsqueda de calidad y practicidad. La elección del 100% algodón asegura una gestión óptima de la humedad, garantizando un secado eficaz y una sensación de frescura constante sobre la piel, ideal para el relax al aire libre.",
        'fr': "La serviette de plage Tivan est réalisée pour offrir une réponse naturelle à la recherche de qualité et de praticité. Le choix du 100% coton assure une gestion optimale de l'humidité, garantissant un séchage efficace et une sensation de fraîcheur constante sur la peau, idéale pour la détente en plein air.",
        'de': "Das Tivan-Strandtuch ist gefertigt, um eine natürliche Antwort auf den Wunsch nach Qualität und Praktikabilität zu geben. Die Wahl von 100% Baumwolle sorgt für ein optimales Feuchtigkeitsmanagement und gewährleistet effektives Trocknen sowie ein konstantes Frischegefühl auf der Haut – ideal für die Entspannung im Freien.",
        'pt': "A toalha de praia Tivan foi realizada para oferecer uma resposta natural à procura de qualidade e praticidade. A escolha do 100% algodão assegura uma gestão ótima da humidade, garantindo uma secagem eficaz e uma sensação de frescura constante sobre a pele, ideal para o relax ao ar livre.",
        'nl': "De Tivan strandhanddoek is gemaakt om een natuurlijk antwoord te bieden op de zoektocht naar kwaliteit en praktisch gemak. De keuze voor 100% katoen zorgt voor een optimaal vochtbeheer en garandeert een doeltreffende droging en een constant gevoel van frisheid op de huid, ideaal om buiten te ontspannen.",
    }),
    (['tremezzo-azzurra', 'tremezzo-beige', 'tremezzo-bianca', 'tremezzo-nera', 'tremezzo-rosa'], {
        'en': "Inspired by alpine elegance, the Tremezzo scarf in pure wool wraps you in natural warmth and softness. Its light weave and soft hand make it an essential accessory for a refined style in every season.",
        'es': "Inspirada en la elegancia alpina, la bufanda Tremezzo en pura lana envuelve con calor y suavidad naturales. Su trama ligera y su tacto mullido la convierten en un accesorio esencial para un estilo refinado en cualquier estación.",
        'fr': "Inspirée de l'élégance alpine, l'écharpe Tremezzo en pure laine enveloppe d'une chaleur et d'une douceur naturelles. Sa trame légère et son toucher moelleux en font un accessoire essentiel pour un style raffiné en toute saison.",
        'de': "Inspiriert von alpiner Eleganz, umhüllt der Tremezzo-Schal aus reiner Wolle mit natürlicher Wärme und Weichheit. Sein leichtes Gewebe und der weiche Griff machen ihn zu einem essenziellen Accessoire für einen raffinierten Stil zu jeder Jahreszeit.",
        'pt': "Inspirado na elegância alpina, o cachecol Tremezzo em pura lã envolve com calor e suavidade naturais. A sua trama leve e o toque macio tornam-no um acessório essencial para um estilo requintado em qualquer estação.",
        'nl': "Geïnspireerd op alpiene elegantie omhult de Tremezzo-sjaal van pure wol met natuurlijke warmte en zachtheid. De lichte weving en de zachte greep maken hem tot een essentieel accessoire voor een verfijnde stijl in elk seizoen.",
    }),
    (['varenna-azzurra', 'varenna-beige', 'varenna-grigia', 'varenna-viola'], {
        'en': "The Varenna scarf, crafted in pure cashmere, unites impalpable softness and natural warmth in perfect balance. A refined, timeless accessory, designed to accompany every season with essential elegance.",
        'es': "La bufanda Varenna, realizada en puro cachemir, une una suavidad impalpable y un calor natural en un equilibrio perfecto. Un accesorio refinado y atemporal, pensado para acompañar cada estación con una elegancia esencial.",
        'fr': "L'écharpe Varenna, réalisée en pur cachemire, unit une douceur impalpable et une chaleur naturelle dans un équilibre parfait. Un accessoire raffiné et intemporel, pensé pour accompagner chaque saison avec une élégance essentielle.",
        'de': "Der Varenna-Schal aus reinem Kaschmir vereint eine unfühlbare Weichheit und natürliche Wärme in perfekter Balance. Ein raffiniertes, zeitloses Accessoire, das jede Jahreszeit mit essenzieller Eleganz begleitet.",
        'pt': "O cachecol Varenna, realizado em puro caxemira, une uma suavidade impalpável e um calor natural num equilíbrio perfeito. Um acessório requintado e atemporal, pensado para acompanhar cada estação com uma elegância essencial.",
        'nl': "De Varenna-sjaal, vervaardigd uit puur kasjmier, verenigt een ongrijpbare zachtheid en natuurlijke warmte in een perfect evenwicht. Een verfijnd en tijdloos accessoire, bedoeld om elk seizoen met essentiële elegantie te begeleiden.",
    }),
]

LANGS = ('en', 'es', 'fr', 'de', 'pt', 'nl')


def main():
    out = []
    out.append("-- Fill description_long_i18n with human-quality translations.")
    out.append("--")
    out.append("-- description_long_i18n was empty for every product, so non-Italian storefronts")
    out.append("-- fell back to the legacy products.json spec-dump. This migration writes clean")
    out.append("-- en/es/fr/de/pt/nl descriptions straight into the DB and tidies two")
    out.append("-- leftover Italian typos. Idempotent.")
    out.append("")
    out.append("-- Italian source tidy-ups")
    out.append("UPDATE products SET description_long = replace(description_long, 'casual.Versatile', 'casual. Versatile') WHERE slug LIKE 'como%';")
    out.append("UPDATE products SET description_long = description_long || '.' WHERE slug LIKE 'tremezzo%' AND right(description_long, 1) <> '.';")
    out.append("")

    out.append("-- description_long_i18n — grouped products")
    for slugs, t in GROUPS:
        slug_list = ", ".join(sql_str(s) for s in slugs)
        out.append(f"UPDATE products SET description_long_i18n = {i18n_obj(t)}")
        out.append(f"  WHERE slug IN ({slug_list});")
    out.append("")

    out.append("-- description_long_i18n — Como twillies")
    for slug, name in COMO.items():
        t = {lang: COMO_TMPL[lang].replace('{N}', name) for lang in LANGS}
        out.append(f"UPDATE products SET description_long_i18n = {i18n_obj(t)}")
        out.append(f"  WHERE slug = {sql_str(slug)};")
    out.append("")

    out.append("-- description_long_i18n — Darsena caps")
    for slug, (kind, col, logo) in DARSENA.items():
        tmpl = DARSENA_CLASSIC_TMPL if kind == 'classic' else DARSENA_TRUCKER_TMPL
        t = {}
        for lang in LANGS:
            t[lang] = tmpl[lang].replace('{col}', COL[col][lang]).replace('{logo}', COL[logo][lang])
        out.append(f"UPDATE products SET description_long_i18n = {i18n_obj(t)}")
        out.append(f"  WHERE slug = {sql_str(slug)};")
    out.append("")

    sql = "\n".join(out) + "\n"
    with open('supabase/migrations/031_description_long_i18n.sql', 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"written: supabase/migrations/031_description_long_i18n.sql ({len(sql)} bytes)")

    # Also emit chunked part-files so the migration can be applied via the
    # Supabase MCP without exceeding the tool read limit.
    stmts = []
    for s in sql.split(';'):
        lines = [ln for ln in s.splitlines() if not ln.strip().startswith('--')]
        joined = "\n".join(lines).strip()
        if joined:
            stmts.append(joined + ';')
    per = 6
    for i in range(0, len(stmts), per):
        part = i // per + 1
        with open(f'/tmp/m031_{part}.sql', 'w', encoding='utf-8') as f:
            f.write("\n".join(stmts[i:i + per]) + "\n")
    print(f"parts: {(len(stmts) + per - 1) // per}, statements: {len(stmts)}")


if __name__ == '__main__':
    main()
