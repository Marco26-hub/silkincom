/**
 * Buyer-intent landing pages. Every commercial field is native in the seven
 * storefront languages so metadata, visible copy and FAQ schema stay aligned.
 */
export type LocaleCopy = Record<string, string>;
export type SeoFaq = { q: LocaleCopy; a: LocaleCopy };

export type SeoCategory = {
  slug: string;
  categories: string[];
  eyebrow: LocaleCopy;
  h1: LocaleCopy;
  title: LocaleCopy;
  description: LocaleCopy;
  intro: LocaleCopy;
  faq: SeoFaq[];
};

function copy(it: string, en: string, es: string, fr: string, de: string, pt: string, nl: string): LocaleCopy {
  return { it, en, es, fr, de, pt, nl };
}

export function pickLocale(value: LocaleCopy, locale: string): string {
  return value[locale] ?? value.en ?? value.it ?? '';
}

export const SEO_CATEGORIES: SeoCategory[] = [
  {
    slug: 'pashmine-cashmere',
    categories: ['bellagio'],
    eyebrow: copy('Cashmere · Lago di Como', 'Cashmere · Lake Como', 'Cachemir · Lago de Como', 'Cachemire · Lac de Côme', 'Cashmere · Comer See', 'Caxemira · Lago de Como', 'Cashmere · Comomeer'),
    h1: copy('Pashmine in Cashmere — Bellagio, Lago di Como', 'Cashmere Pashminas — Bellagio, Lake Como', 'Pashminas de Cachemir — Bellagio, Lago de Como', 'Pashminas en Cachemire — Bellagio, Lac de Côme', 'Cashmere-Pashminas — Bellagio, Comer See', 'Pashminas em Caxemira — Bellagio, Lago de Como', "Cashmere Pashmina's — Bellagio, Comomeer"),
    title: copy('Pashmine in Cashmere Bellagio — Made in Como', 'Bellagio Cashmere Pashminas — Made in Como', 'Pashminas de Cachemir Bellagio — Made in Como', 'Pashminas en Cachemire Bellagio — Made in Como', 'Bellagio Cashmere-Pashminas — Made in Como', 'Pashminas em Caxemira Bellagio — Made in Como', "Bellagio Cashmere Pashmina's — Made in Como"),
    description: copy('Pashmine e scialli Bellagio in puro cashmere, confezionati nel distretto di Como. Da €120, confezione regalo inclusa e spedizione gratuita oltre €200.', 'Bellagio pashminas and shawls in pure cashmere, made in the Como district. From €120, gift box included and free shipping over €200.', 'Pashminas y chales Bellagio de puro cachemir, confeccionados en el distrito de Como. Desde 120 €, caja regalo incluida y envío gratuito desde 200 €.', 'Pashminas et châles Bellagio en pur cachemire, confectionnés dans le district de Côme. Dès 120 €, coffret cadeau inclus et livraison offerte dès 200 €.', 'Bellagio Pashminas und Stolen aus reinem Cashmere, im Textilbezirk von Como gefertigt. Ab 120 €, Geschenkbox inklusive und kostenloser Versand ab 200 €.', 'Pashminas e xales Bellagio em pura caxemira, confecionados no distrito de Como. Desde 120 €, caixa de oferta incluída e envio grátis acima de 200 €.', "Bellagio pashmina's en omslagdoeken van puur cashmere, gemaakt in het textieldistrict van Como. Vanaf €120, geschenkdoos inbegrepen en gratis verzending vanaf €200."),
    intro: copy('La collezione Bellagio unisce puro cashmere, proporzioni avvolgenti e una confezione curata nel distretto tessile di Como. Una pashmina leggera e calda, pensata per accompagnare il giorno, la sera e le occasioni da ricordare.', 'The Bellagio collection combines pure cashmere, enveloping proportions and careful making in the Como textile district. A light, warm pashmina for daytime, evening and memorable occasions.', 'La colección Bellagio combina puro cachemir, proporciones envolventes y una confección cuidada en el distrito textil de Como. Una pashmina ligera y cálida para el día, la noche y las ocasiones especiales.', 'La collection Bellagio associe pur cachemire, proportions enveloppantes et confection soignée dans le district textile de Côme. Une pashmina légère et chaude, du jour au soir.', 'Die Bellagio Kollektion verbindet reines Cashmere, großzügige Proportionen und sorgfältige Fertigung im Textilbezirk von Como. Eine leichte, warme Pashmina für Tag, Abend und besondere Anlässe.', 'A coleção Bellagio combina pura caxemira, proporções envolventes e confeção cuidada no distrito têxtil de Como. Uma pashmina leve e quente para o dia, a noite e ocasiões especiais.', 'De Bellagio-collectie combineert puur cashmere, royale verhoudingen en zorgvuldige afwerking in het textieldistrict van Como. Een lichte, warme pashmina voor overdag, de avond en bijzondere momenten.'),
    faq: [
      {
        q: copy('Le pashmine Bellagio sono in vero cashmere?', 'Are Bellagio pashminas real cashmere?', '¿Las pashminas Bellagio son de cachemir auténtico?', 'Les pashminas Bellagio sont-elles en vrai cachemire ?', 'Sind Bellagio Pashminas aus echtem Cashmere?', 'As pashminas Bellagio são de caxemira verdadeira?', "Zijn Bellagio pashmina's van echt cashmere?"),
        a: copy('Sì. La composizione indicata nelle schede Bellagio è 100% cashmere.', 'Yes. Bellagio product pages state a composition of 100% cashmere.', 'Sí. Las fichas Bellagio indican una composición de 100% cachemir.', 'Oui. Les fiches Bellagio indiquent une composition 100 % cachemire.', 'Ja. Auf den Bellagio Produktseiten ist 100 % Cashmere als Zusammensetzung angegeben.', 'Sim. As fichas Bellagio indicam uma composição de 100% caxemira.', 'Ja. Op de Bellagio-productpagina’s staat een samenstelling van 100% cashmere.'),
      },
      {
        q: copy('Come funziona la spedizione?', 'How does shipping work?', '¿Cómo funciona el envío?', 'Comment fonctionne la livraison ?', 'Wie funktioniert der Versand?', 'Como funciona o envio?', 'Hoe werkt de verzending?'),
        a: copy('In Italia costa €9 ed è gratuita oltre €200. Il reso può essere richiesto entro 14 giorni.', 'Shipping in Italy is €9 and free over €200. A return can be requested within 14 days.', 'En Italia cuesta 9 € y es gratuito desde 200 €. La devolución puede solicitarse en 14 días.', 'En Italie, la livraison coûte 9 € et est offerte dès 200 €. Un retour peut être demandé sous 14 jours.', 'In Italien kostet der Versand 9 € und ist ab 200 € kostenlos. Eine Rückgabe kann innerhalb von 14 Tagen beantragt werden.', 'Em Itália, o envio custa 9 € e é grátis acima de 200 €. A devolução pode ser solicitada em 14 dias.', 'In Italië kost verzending €9 en is deze gratis vanaf €200. Retour kan binnen 14 dagen worden aangevraagd.'),
      },
    ],
  },
  {
    slug: 'foulard-seta',
    categories: ['twilly-como'],
    eyebrow: copy('100% Seta · Made in Como', '100% Silk · Made in Como', '100% Seda · Made in Como', '100 % Soie · Made in Como', '100 % Seide · Made in Como', '100% Seda · Made in Como', '100% Zijde · Made in Como'),
    h1: copy('Foulard in Seta di Como', 'Como Silk Scarves', 'Pañuelos de Seda de Como', 'Foulards en Soie de Côme', 'Seidentücher aus Como', 'Lenços de Seda de Como', 'Zijden Sjaaltjes uit Como'),
    title: copy('Foulard in Seta di Como — Twilly da €75', 'Como Silk Scarves — Twillies from €75', 'Pañuelos de Seda de Como — Desde 75 €', 'Foulards en Soie de Côme — Dès 75 €', 'Seidentücher aus Como — Ab 75 €', 'Lenços de Seda de Como — Desde 75 €', 'Zijden Sjaaltjes uit Como — Vanaf €75'),
    description: copy('Foulard e twilly in 100% seta, confezionati nel distretto di Como. Da €75, colori eleganti, confezione regalo Maison inclusa.', 'Foulards and twillies in 100% silk, made in the Como district. From €75, elegant colours and Maison gift box included.', 'Pañuelos y twillies de 100% seda, confeccionados en el distrito de Como. Desde 75 €, colores elegantes y caja regalo Maison incluida.', 'Foulards et twillies en 100 % soie, confectionnés dans le district de Côme. Dès 75 €, coloris élégants et coffret Maison inclus.', 'Foulards und Twillies aus 100 % Seide, im Textilbezirk von Como gefertigt. Ab 75 €, elegante Farben und Maison-Geschenkbox inklusive.', 'Lenços e twillies em 100% seda, confecionados no distrito de Como. Desde 75 €, cores elegantes e caixa Maison incluída.', 'Foulards en twillies van 100% zijde, gemaakt in het textieldistrict van Como. Vanaf €75, elegante kleuren en Maison-geschenkdoos inbegrepen.'),
    intro: copy('I Twilly Como sono foulard a nastro in 100% seta: leggeri, luminosi e versatili. Si portano al collo, tra i capelli, al polso o sul manico di una borsa, con la precisione tessile del distretto comasco.', 'Twilly Como pieces are ribbon scarves in 100% silk: light, luminous and versatile. Wear one at the neck, in your hair, at the wrist or on a bag handle, with the textile precision of the Como district.', 'Los Twilly Como son pañuelos estrechos de 100% seda: ligeros, luminosos y versátiles. Llévalos al cuello, en el cabello, en la muñeca o en el asa de un bolso.', 'Les Twilly Como sont des foulards rubans en 100 % soie : légers, lumineux et polyvalents. Ils se portent au cou, dans les cheveux, au poignet ou sur une anse de sac.', 'Twilly Como sind schmale Tücher aus 100 % Seide: leicht, leuchtend und vielseitig. Am Hals, im Haar, am Handgelenk oder am Taschengriff getragen.', 'Os Twilly Como são lenços em fita de 100% seda: leves, luminosos e versáteis. Use ao pescoço, no cabelo, no pulso ou na alça de uma mala.', 'Twilly Como zijn smalle sjaaltjes van 100% zijde: licht, glanzend en veelzijdig. Draag ze om de hals, in het haar, om de pols of aan een tas.'),
    faq: [
      {
        q: copy('Di che materiale sono i Twilly Como?', 'What are Twilly Como scarves made of?', '¿De qué material son los Twilly Como?', 'Quelle est la matière des Twilly Como ?', 'Aus welchem Material bestehen Twilly Como?', 'De que material são os Twilly Como?', 'Van welk materiaal zijn Twilly Como?'),
        a: copy('La composizione indicata in ogni scheda Twilly Como è 100% seta.', 'Each Twilly Como product page states a composition of 100% silk.', 'Cada ficha Twilly Como indica una composición de 100% seda.', 'Chaque fiche Twilly Como indique une composition 100 % soie.', 'Auf jeder Twilly Como Produktseite ist 100 % Seide angegeben.', 'Cada ficha Twilly Como indica uma composição de 100% seda.', 'Elke Twilly Como-productpagina vermeldt een samenstelling van 100% zijde.'),
      },
      {
        q: copy('Il foulard arriva in confezione regalo?', 'Does the scarf arrive gift wrapped?', '¿El pañuelo llega en caja regalo?', 'Le foulard est-il livré dans un coffret cadeau ?', 'Wird das Tuch als Geschenk verpackt?', 'O lenço chega em embalagem de oferta?', 'Wordt het sjaaltje als cadeau verpakt?'),
        a: copy('Sì, la confezione regalo Maison è inclusa in ogni ordine.', 'Yes, Maison gift packaging is included with every order.', 'Sí, la caja regalo Maison está incluida en cada pedido.', 'Oui, le coffret cadeau Maison est inclus dans chaque commande.', 'Ja, die Maison-Geschenkverpackung ist bei jeder Bestellung inklusive.', 'Sim, a embalagem de oferta Maison está incluída em cada encomenda.', 'Ja, de Maison-geschenkverpakking is bij elke bestelling inbegrepen.'),
      },
    ],
  },
  {
    slug: 'sciarpe-seta',
    categories: ['varenna', 'tremezzo', 'cernobbio'],
    eyebrow: copy('Cashmere e Lana · Made in Como', 'Cashmere & Wool · Made in Como', 'Cachemir y Lana · Made in Como', 'Cachemire et Laine · Made in Como', 'Cashmere und Wolle · Made in Como', 'Caxemira e Lã · Made in Como', 'Cashmere en Wol · Made in Como'),
    h1: copy('Sciarpe in Cashmere e Lana di Como', 'Como Cashmere & Wool Scarves', 'Bufandas de Cachemir y Lana de Como', 'Écharpes en Cachemire et Laine de Côme', 'Cashmere- und Wollschals aus Como', 'Cachecóis de Caxemira e Lã de Como', 'Cashmere- en Wollen Sjaals uit Como'),
    title: copy('Sciarpe in Cashmere e Lana — Da €70', 'Cashmere & Wool Scarves — From €70', 'Bufandas de Cachemir y Lana — Desde 70 €', 'Écharpes en Cachemire et Laine — Dès 70 €', 'Cashmere- und Wollschals — Ab 70 €', 'Cachecóis de Caxemira e Lã — Desde 70 €', 'Cashmere- en Wollen Sjaals — Vanaf €70'),
    description: copy('Sciarpe unisex in 100% cashmere o 100% lana, confezionate nel distretto di Como. Tremezzo da €70, Varenna da €120, Cernobbio €150.', 'Unisex scarves in 100% cashmere or 100% wool, made in the Como district. Tremezzo from €70, Varenna from €120, Cernobbio €150.', 'Bufandas unisex de 100% cachemir o 100% lana, confeccionadas en el distrito de Como. Tremezzo desde 70 €, Varenna desde 120 €, Cernobbio 150 €.', 'Écharpes unisexes en 100 % cachemire ou 100 % laine, confectionnées dans le district de Côme. Tremezzo dès 70 €, Varenna dès 120 €, Cernobbio 150 €.', 'Unisex-Schals aus 100 % Cashmere oder 100 % Wolle, im Textilbezirk von Como gefertigt. Tremezzo ab 70 €, Varenna ab 120 €, Cernobbio 150 €.', 'Cachecóis unissexo em 100% caxemira ou 100% lã, confecionados no distrito de Como. Tremezzo desde 70 €, Varenna desde 120 €, Cernobbio 150 €.', 'Uniseks sjaals van 100% cashmere of 100% wol, gemaakt in het textieldistrict van Como. Tremezzo vanaf €70, Varenna vanaf €120, Cernobbio €150.'),
    intro: copy('Tre linee, due fibre nobili: Tremezzo in lana per un calore versatile, Varenna e Cernobbio in cashmere per una mano più leggera e soffice. Modelli unisex, colori misurati e confezione regalo inclusa.', 'Three lines, two noble fibres: Tremezzo in wool for versatile warmth, Varenna and Cernobbio in cashmere for a lighter, softer hand. Unisex styles, considered colours and gift box included.', 'Tres líneas, dos fibras nobles: Tremezzo en lana para un calor versátil, Varenna y Cernobbio en cachemir para un tacto más ligero y suave. Modelos unisex y caja regalo incluida.', 'Trois lignes, deux fibres nobles : Tremezzo en laine pour une chaleur polyvalente, Varenna et Cernobbio en cachemire pour un toucher plus léger et doux. Modèles unisexes et coffret inclus.', 'Drei Linien, zwei edle Fasern: Tremezzo aus Wolle für vielseitige Wärme, Varenna und Cernobbio aus Cashmere für einen leichteren, weicheren Griff. Unisex-Modelle und Geschenkbox inklusive.', 'Três linhas, duas fibras nobres: Tremezzo em lã para um calor versátil, Varenna e Cernobbio em caxemira para um toque mais leve e macio. Modelos unissexo e caixa de oferta incluída.', 'Drie lijnen, twee edele vezels: Tremezzo van wol voor veelzijdige warmte, Varenna en Cernobbio van cashmere voor een lichtere, zachtere hand. Uniseks modellen en geschenkdoos inbegrepen.'),
    faq: [
      {
        q: copy('Quali sciarpe sono in cashmere e quali in lana?', 'Which scarves are cashmere and which are wool?', '¿Qué bufandas son de cachemir y cuáles de lana?', 'Quelles écharpes sont en cachemire et lesquelles en laine ?', 'Welche Schals sind aus Cashmere und welche aus Wolle?', 'Quais cachecóis são de caxemira e quais são de lã?', 'Welke sjaals zijn van cashmere en welke van wol?'),
        a: copy('Varenna e Cernobbio sono in 100% cashmere. Tremezzo è in 100% lana.', 'Varenna and Cernobbio are 100% cashmere. Tremezzo is 100% wool.', 'Varenna y Cernobbio son de 100% cachemir. Tremezzo es de 100% lana.', 'Varenna et Cernobbio sont en 100 % cachemire. Tremezzo est en 100 % laine.', 'Varenna und Cernobbio bestehen aus 100 % Cashmere. Tremezzo besteht aus 100 % Wolle.', 'Varenna e Cernobbio são 100% caxemira. Tremezzo é 100% lã.', 'Varenna en Cernobbio zijn van 100% cashmere. Tremezzo is van 100% wol.'),
      },
      {
        q: copy('Le sciarpe sono unisex?', 'Are the scarves unisex?', '¿Las bufandas son unisex?', 'Les écharpes sont-elles unisexes ?', 'Sind die Schals unisex?', 'Os cachecóis são unissexo?', 'Zijn de sjaals uniseks?'),
        a: copy('Sì, le proporzioni e i colori sono pensati per essere indossati da donna e uomo.', 'Yes, the proportions and colours are designed for both women and men.', 'Sí, las proporciones y los colores están pensados para mujer y hombre.', 'Oui, les proportions et les couleurs sont pensées pour les femmes et les hommes.', 'Ja, Proportionen und Farben sind für Damen und Herren konzipiert.', 'Sim, as proporções e cores foram pensadas para mulher e homem.', 'Ja, de verhoudingen en kleuren zijn ontworpen voor dames en heren.'),
      },
    ],
  },
  {
    slug: 'regalo-seta-donna',
    categories: ['twilly-como', 'bellagio'],
    eyebrow: copy('Idee Regalo · Made in Como', 'Gift Ideas · Made in Como', 'Ideas de Regalo · Made in Como', 'Idées Cadeaux · Made in Como', 'Geschenkideen · Made in Como', 'Ideias de Presente · Made in Como', 'Cadeau-ideeën · Made in Como'),
    h1: copy('Idee Regalo in Seta e Cashmere per Lei', 'Silk & Cashmere Gift Ideas for Her', 'Ideas de Regalo en Seda y Cachemir para Ella', 'Idées Cadeaux en Soie et Cachemire pour Elle', 'Geschenkideen aus Seide und Cashmere für Sie', 'Ideias de Presente em Seda e Caxemira para Ela', 'Cadeau-ideeën van Zijde en Cashmere voor Haar'),
    title: copy('Regali Donna in Seta e Cashmere — Made in Como', 'Gifts for Her in Silk & Cashmere — Made in Como', 'Regalos para Ella en Seda y Cachemir — Made in Como', 'Cadeaux pour Elle en Soie et Cachemire — Made in Como', 'Geschenke für Sie aus Seide und Cashmere — Made in Como', 'Presentes para Ela em Seda e Caxemira — Made in Como', 'Cadeaus voor Haar van Zijde en Cashmere — Made in Como'),
    description: copy('Idee regalo eleganti per lei: twilly in 100% seta da €75 e pashmine in 100% cashmere da €120. Confezione regalo Maison inclusa.', 'Elegant gifts for her: 100% silk twillies from €75 and 100% cashmere pashminas from €120. Maison gift box included.', 'Regalos elegantes para ella: twillies de 100% seda desde 75 € y pashminas de 100% cachemir desde 120 €. Caja Maison incluida.', 'Cadeaux élégants pour elle : twillies en 100 % soie dès 75 € et pashminas en 100 % cachemire dès 120 €. Coffret Maison inclus.', 'Elegante Geschenke für Sie: Twillies aus 100 % Seide ab 75 € und Pashminas aus 100 % Cashmere ab 120 €. Maison-Geschenkbox inklusive.', 'Presentes elegantes para ela: twillies em 100% seda desde 75 € e pashminas em 100% caxemira desde 120 €. Caixa Maison incluída.', "Elegante cadeaus voor haar: twillies van 100% zijde vanaf €75 en pashmina's van 100% cashmere vanaf €120. Maison-geschenkdoos inbegrepen."),
    intro: copy('Per un compleanno, un anniversario o un gesto inatteso: scegli un twilly in seta per un dono luminoso e versatile, oppure una pashmina in cashmere per un’eleganza più avvolgente. Ogni ordine arriva nel cofanetto Maison.', 'For a birthday, anniversary or an unexpected gesture: choose a silk twilly for a luminous, versatile gift, or a cashmere pashmina for enveloping elegance. Every order arrives in the Maison box.', 'Para un cumpleaños, aniversario o un gesto inesperado: elige un twilly de seda, luminoso y versátil, o una pashmina de cachemir, más envolvente. Cada pedido llega en la caja Maison.', 'Pour un anniversaire ou une attention inattendue : choisissez un twilly en soie, lumineux et polyvalent, ou une pashmina en cachemire, plus enveloppante. Chaque commande arrive dans le coffret Maison.', 'Zum Geburtstag, Jahrestag oder als unerwartete Geste: ein Seiden-Twilly als leuchtendes, vielseitiges Geschenk oder eine Cashmere-Pashmina für umhüllende Eleganz. Jede Bestellung kommt in der Maison-Box.', 'Para um aniversário ou um gesto inesperado: escolha um twilly de seda, luminoso e versátil, ou uma pashmina de caxemira, mais envolvente. Cada encomenda chega na caixa Maison.', 'Voor een verjaardag, jubileum of onverwacht gebaar: kies een zijden twilly als licht en veelzijdig cadeau, of een cashmere pashmina voor omhullende elegantie. Elke bestelling komt in de Maison-doos.'),
    faq: [
      {
        q: copy('La confezione regalo è inclusa?', 'Is gift packaging included?', '¿Está incluida la caja regalo?', 'Le coffret cadeau est-il inclus ?', 'Ist die Geschenkverpackung inklusive?', 'A embalagem de oferta está incluída?', 'Is de geschenkverpakking inbegrepen?'),
        a: copy('Sì, ogni ordine include il cofanetto regalo Maison.', 'Yes, every order includes the Maison gift box.', 'Sí, cada pedido incluye la caja regalo Maison.', 'Oui, chaque commande comprend le coffret cadeau Maison.', 'Ja, jede Bestellung enthält die Maison-Geschenkbox.', 'Sim, cada encomenda inclui a caixa de oferta Maison.', 'Ja, elke bestelling bevat de Maison-geschenkdoos.'),
      },
    ],
  },
  {
    slug: 'camicie-lino',
    categories: ['riva'],
    eyebrow: copy('Lino e Cotone · Made in Italy', 'Linen & Cotton · Made in Italy', 'Lino y Algodón · Made in Italy', 'Lin et Coton · Made in Italy', 'Leinen und Baumwolle · Made in Italy', 'Linho e Algodão · Made in Italy', 'Linnen en Katoen · Made in Italy'),
    h1: copy('Camicie in Lino e Cotone — Riva', 'Linen & Cotton Shirts — Riva', 'Camisas de Lino y Algodón — Riva', 'Chemises en Lin et Coton — Riva', 'Hemden aus Leinen und Baumwolle — Riva', 'Camisas de Linho e Algodão — Riva', 'Overhemden van Linnen en Katoen — Riva'),
    title: copy('Camicia Riva in Lino e Cotone — Made in Italy', 'Riva Linen & Cotton Shirt — Made in Italy', 'Camisa Riva de Lino y Algodón — Made in Italy', 'Chemise Riva en Lin et Coton — Made in Italy', 'Riva Hemd aus Leinen und Baumwolle — Made in Italy', 'Camisa Riva em Linho e Algodão — Made in Italy', 'Riva Overhemd van Linnen en Katoen — Made in Italy'),
    description: copy('Camicia Riva in 53% lino e 47% cotone, prodotta in Italia. Collo alla coreana, vestibilità leggera, €75 e reso entro 14 giorni.', 'Riva shirt in 53% linen and 47% cotton, made in Italy. Mandarin collar, light fit, €75 and 14-day returns.', 'Camisa Riva de 53% lino y 47% algodón, producida en Italia. Cuello mandarín, corte ligero, 75 € y devolución en 14 días.', 'Chemise Riva en 53 % lin et 47 % coton, fabriquée en Italie. Col officier, coupe légère, 75 € et retour sous 14 jours.', 'Riva Hemd aus 53 % Leinen und 47 % Baumwolle, in Italien hergestellt. Stehkragen, leichter Sitz, 75 € und 14 Tage Rückgaberecht.', 'Camisa Riva em 53% linho e 47% algodão, produzida em Itália. Gola mandarim, corte leve, 75 € e devolução em 14 dias.', 'Riva overhemd van 53% linnen en 47% katoen, gemaakt in Italië. Mandarijnkraag, lichte pasvorm, €75 en retour binnen 14 dagen.'),
    intro: copy('Riva bilancia la freschezza del lino con la morbidezza e la stabilità del cotone. Il collo alla coreana e la linea essenziale la rendono una camicia estiva versatile, dalla città alle giornate sul Lago.', 'Riva balances linen freshness with cotton softness and stability. Its mandarin collar and clean line make it a versatile summer shirt, from the city to days by the Lake.', 'Riva equilibra la frescura del lino con la suavidad y estabilidad del algodón. El cuello mandarín y la línea esencial crean una camisa de verano versátil.', 'Riva équilibre la fraîcheur du lin avec la douceur et la tenue du coton. Son col officier et sa ligne épurée en font une chemise d’été polyvalente.', 'Riva verbindet die Frische von Leinen mit der Weichheit und Formstabilität von Baumwolle. Stehkragen und klare Linie machen es zum vielseitigen Sommerhemd.', 'Riva equilibra a frescura do linho com a suavidade e estabilidade do algodão. A gola mandarim e a linha essencial criam uma camisa de verão versátil.', 'Riva combineert de frisheid van linnen met de zachtheid en vormvastheid van katoen. De mandarijnkraag en strakke lijn maken dit een veelzijdig zomeroverhemd.'),
    faq: [
      {
        q: copy('Qual è la composizione della camicia Riva?', 'What is the Riva shirt composition?', '¿Cuál es la composición de la camisa Riva?', 'Quelle est la composition de la chemise Riva ?', 'Wie ist das Riva Hemd zusammengesetzt?', 'Qual é a composição da camisa Riva?', 'Wat is de samenstelling van het Riva overhemd?'),
        a: copy('La camicia Riva è composta da 53% lino e 47% cotone.', 'The Riva shirt is 53% linen and 47% cotton.', 'La camisa Riva es 53% lino y 47% algodón.', 'La chemise Riva est composée de 53 % lin et 47 % coton.', 'Das Riva Hemd besteht aus 53 % Leinen und 47 % Baumwolle.', 'A camisa Riva é composta por 53% linho e 47% algodão.', 'Het Riva overhemd bestaat uit 53% linnen en 47% katoen.'),
      },
      {
        q: copy('La camicia è prodotta in Italia?', 'Is the shirt made in Italy?', '¿La camisa está producida en Italia?', 'La chemise est-elle fabriquée en Italie ?', 'Wird das Hemd in Italien hergestellt?', 'A camisa é produzida em Itália?', 'Wordt het overhemd in Italië gemaakt?'),
        a: copy('Sì, la scheda prodotto indica origine e produzione interamente in Italia.', 'Yes, the product page states that it is produced entirely in Italy.', 'Sí, la ficha de producto indica que está producida íntegramente en Italia.', 'Oui, la fiche produit indique une fabrication entièrement en Italie.', 'Ja, laut Produktseite wird es vollständig in Italien hergestellt.', 'Sim, a ficha do produto indica produção integral em Itália.', 'Ja, volgens de productpagina wordt het volledig in Italië gemaakt.'),
      },
    ],
  },
  {
    slug: 'teli-mare',
    categories: ['tivan'],
    eyebrow: copy('100% Cotone · Lago di Como', '100% Cotton · Lake Como', '100% Algodón · Lago de Como', '100 % Coton · Lac de Côme', '100 % Baumwolle · Comer See', '100% Algodão · Lago de Como', '100% Katoen · Comomeer'),
    h1: copy('Teli Lago in Cotone — Tivan', 'Cotton Lake Towels — Tivan', 'Toallas de Lago de Algodón — Tivan', 'Serviettes de Lac en Coton — Tivan', 'Seebadetücher aus Baumwolle — Tivan', 'Toalhas de Lago em Algodão — Tivan', 'Katoenen Meerdoeken — Tivan'),
    title: copy('Telo Lago Tivan in 100% Cotone — €45', 'Tivan 100% Cotton Lake Towel — €45', 'Toalla de Lago Tivan de 100% Algodón — 45 €', 'Serviette de Lac Tivan en 100 % Coton — 45 €', 'Tivan Seebadetuch aus 100 % Baumwolle — 45 €', 'Toalha de Lago Tivan em 100% Algodão — 45 €', 'Tivan Meerdoek van 100% Katoen — €45'),
    description: copy('Telo Tivan in 100% cotone, morbido, assorbente e leggero. Un accessorio pratico per lago e spiaggia, €45 con confezione Maison inclusa.', 'Tivan towel in 100% cotton, soft, absorbent and light. A practical accessory for lake and beach, €45 with Maison packaging included.', 'Toalla Tivan de 100% algodón, suave, absorbente y ligera. Un accesorio práctico para lago y playa, 45 € con caja Maison incluida.', 'Serviette Tivan en 100 % coton, douce, absorbante et légère. Un accessoire pratique pour le lac et la plage, 45 € avec coffret Maison inclus.', 'Tivan Tuch aus 100 % Baumwolle, weich, saugfähig und leicht. Ein praktisches Accessoire für See und Strand, 45 € inklusive Maison-Verpackung.', 'Toalha Tivan em 100% algodão, macia, absorvente e leve. Um acessório prático para lago e praia, 45 € com embalagem Maison incluída.', 'Tivan doek van 100% katoen, zacht, absorberend en licht. Een praktisch accessoire voor meer en strand, €45 inclusief Maison-verpakking.'),
    intro: copy('Tivan è il telo leggero da portare sul Lago, in barca o in spiaggia. Il 100% cotone offre una mano morbida e una buona assorbenza, in un formato facile da piegare e mettere in borsa.', 'Tivan is the light towel to take to the Lake, on a boat or to the beach. Its 100% cotton construction feels soft and absorbent in an easy-to-fold format.', 'Tivan es la toalla ligera para llevar al Lago, en barco o a la playa. El 100% algodón ofrece un tacto suave y buena absorción en un formato fácil de doblar.', 'Tivan est la serviette légère à emporter au lac, en bateau ou à la plage. Le 100 % coton offre douceur et absorption dans un format facile à plier.', 'Tivan ist das leichte Tuch für See, Boot oder Strand. 100 % Baumwolle sorgt für weichen Griff und gute Saugfähigkeit in einem leicht faltbaren Format.', 'Tivan é a toalha leve para levar ao Lago, ao barco ou à praia. O 100% algodão oferece toque macio e boa absorção num formato fácil de dobrar.', 'Tivan is de lichte doek voor aan het meer, op de boot of op het strand. 100% katoen voelt zacht en absorberend in een gemakkelijk opvouwbaar formaat.'),
    faq: [
      {
        q: copy('Di che materiale è il telo Tivan?', 'What is the Tivan towel made of?', '¿De qué material es la toalla Tivan?', 'Quelle est la matière de la serviette Tivan ?', 'Aus welchem Material besteht das Tivan Tuch?', 'De que material é a toalha Tivan?', 'Van welk materiaal is de Tivan-doek?'),
        a: copy('La composizione indicata nella scheda prodotto è 100% cotone.', 'The product page states a composition of 100% cotton.', 'La ficha de producto indica una composición de 100% algodón.', 'La fiche produit indique une composition 100 % coton.', 'Auf der Produktseite ist 100 % Baumwolle als Zusammensetzung angegeben.', 'A ficha do produto indica uma composição de 100% algodão.', 'Op de productpagina staat een samenstelling van 100% katoen.'),
      },
    ],
  },
];

export function getSeoCategory(slug: string): SeoCategory | undefined {
  return SEO_CATEGORIES.find((category) => category.slug === slug);
}

export const SEO_CATEGORY_SLUGS = SEO_CATEGORIES.map((category) => category.slug);

export const PRODUCT_CAT_TO_SEO: Record<string, string> = {
  'twilly-como': 'foulard-seta',
  bellagio: 'pashmine-cashmere',
  varenna: 'sciarpe-seta',
  cernobbio: 'sciarpe-seta',
  tremezzo: 'sciarpe-seta',
  riva: 'camicie-lino',
  tivan: 'teli-mare',
};
