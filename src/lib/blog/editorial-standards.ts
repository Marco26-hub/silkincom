import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * SILKinCOM editorial standard for "Trame di Como" articles.
 *
 * Shared by the AI draft generator (admin "Genera bozza AI" + automation API):
 * the rules below are the house style the journal is written in, the live
 * context gives the model real catalogue facts and the only link targets that
 * exist, and lintBlogContent() repairs what the public renderer cannot show.
 *
 * The renderer (src/app/[locale]/trame-di-como/[slug]/page.tsx) splits the body
 * on blank lines and only understands "## ", "### " and [text](/path) — any
 * other markdown reaches the reader as raw symbols.
 */

export const EDITORIAL_RULES = `Sei l'editor del giornale "Trame di Como" di SILKinCOM, atelier di seta e cashmere di Como. Gli articoli escono firmati da Marco Dibenedetto, fondatore. Scrivi in italiano.

VOCE
- Italiano editoriale da rivista, lusso misurato. Frasi pulite, concrete, ritmo vario. Si parla da maison ("noi"), ci si rivolge al lettore con naturalezza.
- Concretezza prima di tutto: fibre, mani, finiture, misure, gesti, momenti e luoghi reali del Lago di Como.
- Vietati: emoji, punti esclamativi, superlativi vuoti (straordinario, incredibile, iconico, must-have, il migliore), inviti da e-commerce ("scopri ora", "non perdere"), cliché da testo generato ("nel mondo di oggi", "immergiti", "un viaggio", "in conclusione", "non è solo X, è Y" ripetuto).

VERITÀ — NON NEGOZIABILE
- Prezzi, composizioni, misure, colori e varianti si prendono SOLO dal CATALOGO fornito. Se un dato non c'è, scrivi senza quel dato.
- Mai inventare statistiche, percentuali, studi, clienti, hotel partner, testimonianze, premi, collaborazioni o citazioni. Niente "lavoriamo con strutture di…" o "molti clienti ci dicono…".
- Scadenze sempre esplicite: "entro fine ottobre", non "entro ottobre" (ambiguo, e in traduzione diventa "prima di ottobre").
- Dati certi del programma B2B (hospitality, corporate gifting, white label): minimo 20 pezzi anche misti, personalizzazione in 4–8 settimane secondo complessità, risposta entro 24 ore con listino dedicato, monogramma o ricamo dedicato, confezione regalo, capsule white label.
- Il territorio è un fatto: Como è da secoli il distretto serico di riferimento in Europa. Racconta l'origine senza esagerare.

FOCUS
- Chiama ogni prodotto con il TIPO indicato nel CATALOGO (sciarpa, pashmina, twilly…). Il tipo del catalogo vince anche sul brief: se il brief chiama "pashmina" una sciarpa, scrivi sciarpa.
- Un articolo, un protagonista. Se il brief indica un prodotto o una linea, l'articolo parla di quello; altri prodotti compaiono al massimo come link di passaggio, mai come sezioni.
- Non riscrivere un articolo già pubblicato (vedi ARTICOLI ESISTENTI): se l'argomento è vicino, scegli un angolo diverso e linka quello esistente.

FORMATO (il sito mostra tutto il resto come testo sporco)
- Paragrafi separati da UNA riga vuota.
- Titoli di sezione: riga che inizia con "## ". Sottosezioni: "### ". Ogni titolo è un blocco a sé, con riga vuota prima e dopo.
- VIETATI: "# " (titolo H1), elenchi puntati o numerati, **grassetto**, *corsivo*, tabelle, citazioni con ">", HTML, immagini.
- Link: solo nella forma [testo](/percorso) e solo con percorsi presi da LINK CONSENTITI. Da 4 a 8 link interni, distribuiti nel testo, con testo d'ancora descrittivo. Mai URL assoluti, mai percorsi inventati.
- Il primo blocco è SEMPRE un paragrafo, mai un titolo: apertura narrativa di 3–5 frasi su un momento preciso (il sito lo stampa con capolettera).

STRUTTURA
- Lunghezza: tra 1.200 e 1.900 parole.
- Apertura narrativa → da 6 a 9 sezioni "## " → blocco domande → chiusura.
- I titoli "## " sono specifici e informativi (Google e le AI li estraggono come risposte), non slogan.
- Quando servono elenchi (misure, usi, passaggi), usa sottosezioni "### " con un paragrafo ciascuna.
- Blocco domande: una sezione "## " (es. "Le domande che ci fanno…") con 4–6 domande in "### ", ognuna seguita da una risposta di 2–4 frasi che si regge da sola, citabile fuori contesto.
- Chiusura: sezione "## " con invito all'azione verso la pagina giusta (/b2b per hotel e aziende; pagina prodotto o collezione per i privati) e una frase finale che resti in mente.

FOTO (se allegata)
- È la copertina dell'articolo: guardala e rendi il testo coerente con ciò che mostra — luogo, luce, stagione, momento della giornata, gesto. L'apertura narrativa può partire da quella scena.
- Descrivi solo ciò che si vede davvero; non inventare dettagli fuori campo.
- Il prodotto lo prendi dal BRIEF e dal CATALOGO, mai dalla foto: non dedurre modello, colore commerciale o prezzo da quello che vedi. Se foto e brief sembrano non combaciare, segui il brief.

SEO
- title: 55–110 caratteri, parola chiave principale nella prima metà, una promessa chiara.
- excerpt: 1–2 frasi, 150–230 caratteri. Appare in corsivo sotto il titolo: deve incuriosire, non riassumere.
- seoTitle: massimo 60 caratteri, termina con " | SILKinCOM".
- seoDescription: 130–155 caratteri, parola chiave + beneficio concreto.
- slug: kebab-case in italiano, 4–8 parole, parola chiave principale, niente date e niente stopword inutili.

OUTPUT
Solo JSON valido, senza testo prima o dopo:
{"title": string, "slug": string, "excerpt": string, "content": string, "seoTitle": string, "seoDescription": string}`;

// Public collection / editorial pages that exist under src/app/[locale].
const STATIC_LINKS: Array<[string, string]> = [
  ['/b2b', 'Programma Hospitality & Corporate Gifting (hotel, aziende, white label)'],
  ['/pashmine-cashmere', 'Collezione pashmine in cashmere'],
  ['/foulard-seta', 'Collezione foulard in seta'],
  ['/sciarpe-seta', 'Collezione sciarpe'],
  ['/camicie-lino', 'Collezione camicie in lino'],
  ['/teli-mare', 'Collezione teli mare'],
  ['/regalo-seta-donna', 'Idee regalo in seta per lei'],
  ['/collezioni', 'Tutte le collezioni'],
  ['/materiali', 'Materiali: seta, cashmere, lana, lino'],
  ['/cura-prodotto', 'Cura e lavaggio dei capi'],
  ['/la-nostra-storia', 'La storia della maison'],
  ['/atelier', "L'atelier"],
  ['/artigiani', 'Gli artigiani'],
  ['/glossario', 'Glossario tessile'],
  ['/recensioni', 'Recensioni clienti'],
  ['/faq', 'Domande frequenti'],
  ['/spedizioni', 'Spedizioni'],
  ['/contatti', 'Contatti'],
];

export type EditorialContext = {
  /** Prompt block: catalogue, existing articles, allowed links. */
  text: string;
  /** Every internal path the article may link to. */
  allowedPaths: Set<string>;
};

type ProductRow = {
  slug: string;
  name: string;
  price: number | null;
  composition: string | null;
  dimensions: string | null;
  // many-to-one embed: an object at runtime, typed as an array by supabase-js
  categories: { slug: string } | { slug: string }[] | null;
};

// Product type per line, as the storefront labels it (ProductCard
// CATEGORY_TYPE): the model must never call a scarf a pashmina.
const TYPE_BY_LINE: Record<string, string> = {
  bellagio: 'pashmina',
  cernobbio: 'sciarpa',
  tremezzo: 'sciarpa',
  varenna: 'sciarpa',
  'twilly-como': 'twilly',
  darsena: 'cappello',
  lario: 't-shirt',
  melzi: 'shorts',
  riva: 'camicia',
  tivan: 'telo mare',
};

/** Live catalogue + published articles, so the model writes from real facts. */
export async function buildEditorialContext(): Promise<EditorialContext> {
  const supabase = createServiceClient();
  const [{ data: products }, { data: posts }] = await Promise.all([
    supabase
      .from('products')
      .select('slug, name, price, composition, dimensions, categories!products_category_id_fkey(slug)')
      .eq('status', 'published')
      .order('slug'),
    supabase
      .from('blog_posts')
      .select('slug, title')
      .eq('status', 'published')
      // Scheduled posts aren't live yet: linking them would 404 until their date.
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
  ]);

  const allowedPaths = new Set(STATIC_LINKS.map(([p]) => p));
  const catalogue = ((products ?? []) as unknown as ProductRow[]).map((p) => {
    allowedPaths.add(`/prodotto/${p.slug}`);
    const line = Array.isArray(p.categories) ? p.categories[0]?.slug : p.categories?.slug;
    const type = line ? TYPE_BY_LINE[line] : undefined;
    const bits = [
      type ? type.toUpperCase() : null,
      p.name,
      p.price != null ? `€${p.price}` : null,
      p.composition,
      p.dimensions,
    ].filter(Boolean);
    return `- /prodotto/${p.slug} — ${bits.join(' · ')}`;
  });
  const articles = ((posts ?? []) as Array<{ slug: string; title: string }>).map((p) => {
    allowedPaths.add(`/trame-di-como/${p.slug}`);
    return `- /trame-di-como/${p.slug} — ${p.title}`;
  });

  const text = [
    'CATALOGO (unica fonte per tipo di prodotto, prezzi, composizioni, misure; pagine prodotto linkabili):',
    ...catalogue,
    '',
    'ARTICOLI ESISTENTI (non duplicarli; linkali quando pertinenti):',
    ...articles,
    '',
    'LINK CONSENTITI — pagine del sito:',
    ...STATIC_LINKS.map(([p, d]) => `- ${p} — ${d}`),
    '(più ogni /prodotto/… del CATALOGO e ogni /trame-di-como/… degli ARTICOLI ESISTENTI)',
  ].join('\n');

  return { text, allowedPaths };
}

/**
 * Repairs markdown the renderer can't display and drops links to paths that
 * don't exist. Returns the cleaned body plus a note per repair, so the admin
 * sees what the model got wrong.
 */
export function lintBlogContent(
  raw: string,
  allowedPaths: Set<string>,
): { content: string; fixes: string[] } {
  const fixes: string[] = [];
  let text = raw.replace(/\r\n/g, '\n').trim();

  // Headings must be standalone blocks; the body splits on blank lines.
  text = text.replace(/([^\n])\n(#{2,3} )/g, '$1\n\n$2');
  text = text.replace(/^(#{2,3} [^\n]+)\n(?!\n)/gm, '$1\n\n');

  const blocks: string[] = [];
  for (let block of text.split(/\n{2,}/)) {
    block = block.trim();
    if (!block) continue;

    // H1 duplicates the page title.
    if (/^# /.test(block)) {
      fixes.push('rimosso titolo H1');
      continue;
    }
    if (/^#{4,} /.test(block)) {
      block = block.replace(/^#{4,} /, '### ');
      fixes.push('titolo #### ridotto a ###');
    }

    // Lists: each item becomes its own paragraph.
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
      fixes.push('elenco convertito in paragrafi');
      for (const l of lines) blocks.push(l.replace(/^\s*([-*•]|\d+[.)])\s+/, '').trim());
      continue;
    }

    blocks.push(lines.map((l) => l.trim()).join(' '));
  }

  let content = blocks.join('\n\n');

  if (/\*\*|__/.test(content)) fixes.push('rimosso grassetto');
  content = content.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');

  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label: string, url: string) => {
    const path = url.trim().replace(/^https?:\/\/(www\.)?silkincom\.com/i, '').replace(/\/$/, '') || '/';
    if (allowedPaths.has(path)) return `[${label}](${path})`;
    fixes.push(`link rimosso: ${url}`);
    return label;
  });

  if (/^#{2,3} /.test(content)) fixes.push('attenzione: il testo inizia con un titolo');

  return { content, fixes };
}
