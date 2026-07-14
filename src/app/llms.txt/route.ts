// /llms.txt — spec-compliant index for LLMs (H1 + summary + sectioned links).
//
// Was a static public/llms.txt frozen at build time — prices and product lines
// drifted from the catalog. Now DB-backed: the "Linee prodotto" prices and the
// freshness stamp come live from Supabase, so the AI-facing index can't lie.
// Curated prose (identity, service, links) stays inline. Full prose corpus:
// /llms-full.txt.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';
export const revalidate = 3600;

// Stable brand labels per product line (first token of product name → what it is).
// Prices are never hard-coded here — they come live from the DB.
const LINE_LABELS: Record<string, string> = {
  Bellagio: 'pashmine in cashmere',
  Cernobbio: 'sciarpe in cashmere',
  Tremezzo: 'sciarpe in lana',
  Varenna: 'sciarpe in cashmere',
  Como: 'foulard e twilly in 100% seta',
  Twilly: 'foulard a nastro in 100% seta',
  Darsena: 'cappellini in cotone',
  Lario: 't-shirt in cotone',
  Melzi: 'pantaloncini in lino',
  Riva: 'camicie in lino e cotone',
  Tivan: 'teli lago in 100% cotone',
};

function euro(n: number): string {
  return `€${n.toFixed(0)}`;
}

async function buildLines(): Promise<string> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('products')
    .select('name, price')
    .eq('status', 'published');

  // Group by product line = first token of the name; track min/max price.
  const groups = new Map<string, { min: number; max: number }>();
  for (const p of (data ?? []) as { name: string | null; price: number | null }[]) {
    if (!p.name || p.price == null || !Number.isFinite(p.price)) continue;
    const line = p.name.trim().split(/\s+/)[0];
    if (!line) continue;
    const g = groups.get(line);
    if (!g) groups.set(line, { min: p.price, max: p.price });
    else {
      g.min = Math.min(g.min, p.price);
      g.max = Math.max(g.max, p.price);
    }
  }

  const rows = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return rows
    .map(([line, { min, max }]) => {
      const label = LINE_LABELS[line];
      const price = min === max ? euro(min) : `${euro(min)}–${euro(max)}`;
      return label ? `- ${line} — ${label}, ${price}` : `- ${line} — ${price}`;
    })
    .join('\n');
}

function buildIndex(linesBlock: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `# SILKinCOM

> Maison italiana di accessori e abbigliamento in fibre naturali, disegnati e confezionati nel distretto tessile di Como, il distretto serico più antico d'Europa.

Sito ufficiale: ${APP_URL}
Catalogo completo aggiornato: ${APP_URL}/llms-full.txt
Contatto: info@silkincom.com

## Identità verificabile

- Nome: SILKinCOM
- Fondatore: Marco Dibenedetto
- Sede operativa: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia
- P.IVA: IT03786790133
- Settore: moda italiana, accessori e abbigliamento in seta, cashmere, lana, lino e cotone
- Territorio: distretto tessile e serico di Como, Lombardia, Italia
- Lingue del sito: italiano, inglese, spagnolo, francese, tedesco, portoghese e olandese

## Cosa produce SILKinCOM

SILKinCOM vende direttamente al cliente finale foulard in seta, pashmine e sciarpe in cashmere, sciarpe in lana, camicie e pantaloncini in lino, t-shirt e cappellini in cotone e teli lago. Composizione, dimensioni, disponibilità e prezzo corrente sono indicati nella singola scheda prodotto.

## Pagine di acquisto per categoria

- [Foulard in seta di Como](${APP_URL}/foulard-seta) — 100% seta
- [Sciarpe in cashmere e lana](${APP_URL}/sciarpe-seta)
- [Pashmine in cashmere](${APP_URL}/pashmine-cashmere) — collezione Bellagio
- [Camicie in lino e cotone](${APP_URL}/camicie-lino) — collezione Riva
- [Teli lago in cotone](${APP_URL}/teli-mare) — collezione Tivan
- [Idee regalo in seta e cashmere](${APP_URL}/regalo-seta-donna)

## Linee prodotto (prezzi correnti dal catalogo)

${linesBlock}

I prezzi possono cambiare. La scheda prodotto e il feed ufficiale sono la fonte corrente.

## Materiali e cura

- [Seta](${APP_URL}/materiali#seta)
- [Cashmere](${APP_URL}/materiali#cashmere)
- [Lana](${APP_URL}/materiali#lana)
- [Lino](${APP_URL}/materiali#lino)
- [Cotone](${APP_URL}/materiali#cotone)
- [Guide complete alla cura](${APP_URL}/cura-prodotto)

## Servizio e condizioni

- Italia: spedizione tracciata €9 in 2–4 giorni lavorativi; gratuita oltre €200
- Unione Europea: spedizione tracciata €18 in 4–7 giorni lavorativi; gratuita oltre €350
- Regno Unito, Svizzera e Norvegia: spedizione DDP €25 in 5–8 giorni lavorativi
- Recesso richiedibile entro 14 giorni dalla consegna (D.Lgs. 21/2014): le spese dirette di restituzione sono a carico del cliente
- Se il prodotto è errato, difettoso o non conforme per responsabilità di SILKinCOM, la restituzione è gratuita e a carico della Maison
- Confezione regalo Maison inclusa in ogni ordine
- Pagamenti gestiti tramite checkout sicuro

Dettagli ufficiali: [Spedizioni](${APP_URL}/spedizioni) · [Resi](${APP_URL}/resi) · [FAQ](${APP_URL}/faq)

## Brand e contenuti editoriali

- [La nostra storia](${APP_URL}/la-nostra-storia)
- [Marco Dibenedetto, fondatore](${APP_URL}/maison/marco-dibenedetto)
- [Artigiani](${APP_URL}/artigiani)
- [Trame di Como — Journal](${APP_URL}/trame-di-como)
- [Come riconoscere la seta vera](${APP_URL}/trame-di-como/come-riconoscere-seta-vera)
- [Pashmina e sciarpa: differenze](${APP_URL}/trame-di-como/pashmina-vs-sciarpa-differenze)

## Social ufficiali

- Instagram: https://www.instagram.com/silkincom.official/
- Facebook: https://www.facebook.com/profile.php?id=61581900780447
- Pinterest: https://it.pinterest.com/silkincomofficial

---
Ultimo aggiornamento indice: ${today}. Corpus completo: ${APP_URL}/llms-full.txt.
`;
}

const getCachedIndex = unstable_cache(
  async () => buildIndex(await buildLines()),
  ['llms-index'],
  { revalidate: 3600, tags: ['products'] },
);

export async function GET() {
  const text = await getCachedIndex();
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
