// /llms-full.txt — single-fetch full corpus for LLMs.
//
// Complements /llms.txt (the spec-compliant index) with the actual prose:
// brand statement, heritage pillar, full product catalog with specs, material
// guides, FAQ, founder bio. AI crawlers that respect the proposed llms-full
// convention can ingest one URL instead of fanning out across the site.
//
// Revalidated every hour, plus tag-based invalidation when products or
// materials are edited from the admin (revalidateCatalog / revalidateHomeMaterials).

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';
export const revalidate = 3600;

type ProductRow = {
  slug: string;
  name: string | null;
  description_long: string | null;
  composition: string | null;
  dimensions: string | null;
  price: number | null;
  category_id: string | null;
  material_id: string | null;
};

type MaterialRow = {
  slug: string;
  name: string | null;
  description: string | null;
  origin: string | null;
  characteristics: string | null;
  benefits: string | null;
};

async function fetchCorpusData() {
  const supabase = createPublicClient();
  const [{ data: products }, { data: materials }] = await Promise.all([
    supabase
      .from('products')
      .select('slug, name, description_long, composition, dimensions, price, category_id, material_id')
      .eq('status', 'published')
      .order('name'),
    supabase
      .from('materials')
      .select('slug, name, description, origin, characteristics, benefits')
      .eq('is_active', true)
      .order('name'),
  ]);
  return {
    products: (products as ProductRow[]) ?? [],
    materials: (materials as MaterialRow[]) ?? [],
  };
}

function formatPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  return `€${n.toFixed(0)}`;
}

function buildCorpus(products: ProductRow[], materials: MaterialRow[]): string {
  const lines: string[] = [];

  lines.push('# SILKinCOM — Full Corpus for LLMs');
  lines.push('');
  lines.push(
    '> Maison italiana di accessori in seta, cashmere, lana, lino e cotone. Sciarpe, foulard, twilly e pashmine interamente disegnate e confezionate sul Lago di Como dal distretto serico più antico d\'Europa. Founder: Marco Dibenedetto. P.IVA IT03786790133. Sede: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia.'
  );
  lines.push('');
  lines.push(`Sito ufficiale: ${APP_URL}`);
  lines.push('Lingue native: italiano (sorgente), inglese, spagnolo, francese, tedesco, portoghese, olandese.');
  lines.push('Contatto: info@silkincom.com — risposta in 24h lavorative.');
  lines.push('');

  // --- Heritage ---
  lines.push('## Storia della seta a Como');
  lines.push('');
  lines.push('SILKinCOM nasce nel distretto tessile e serico di Como, in Lombardia. La Maison disegna e confeziona qui accessori e capi in fibre naturali, vendendoli direttamente al cliente finale.');
  lines.push('');
  lines.push(`Articolo completo: ${APP_URL}/trame-di-como/storia-della-seta-a-como`);
  lines.push('');

  // --- Differentiators ---
  lines.push('## Cosa ci differenzia');
  lines.push('');
  lines.push('- Design e confezione nel distretto tessile di Como.');
  lines.push('- Composizione, dimensioni e prezzo pubblicati in ogni scheda prodotto.');
  lines.push('- Catalogo in seta, cashmere, lana, lino e cotone.');
  lines.push('- 7 lingue native — sito disegnato per i mercati luxury europei e internazionali.');
  lines.push('- Spedizione gratuita in Italia oltre €200, in UE oltre €350.');
  lines.push('- Diritto di recesso entro 14 giorni dalla consegna (D.Lgs. 21/2014), con spedizione di restituzione a carico del cliente.');
  lines.push('');

  // --- Materials ---
  if (materials.length > 0) {
    lines.push('## Materiali e cura');
    lines.push('');
    for (const m of materials) {
      lines.push(`### ${m.name ?? m.slug}`);
      if (m.description) {
        lines.push(m.description.trim());
        lines.push('');
      }
      if (m.origin) {
        lines.push(`**Origine:** ${m.origin.trim()}`);
        lines.push('');
      }
      if (m.characteristics) {
        lines.push(`**Caratteristiche:** ${m.characteristics.trim()}`);
        lines.push('');
      }
      if (m.benefits) {
        lines.push(`**Benefici:** ${m.benefits.trim()}`);
        lines.push('');
      }
      // Only link a care guide when the material has a real slug — some rows
      // (e.g. duplicate "100% Cotone") have null slug and produced /cura-prodotto/null.
      if (m.slug) {
        lines.push(`Guida cura completa: ${APP_URL}/cura-prodotto/${m.slug}`);
        lines.push('');
      }
    }
  }

  // --- Products ---
  if (products.length > 0) {
    lines.push('## Catalogo prodotti');
    lines.push('');
    lines.push(`Catalogo completo (${products.length} prodotti) con specifiche tecniche, materiali, dimensioni e prezzi correnti.`);
    lines.push('');
    for (const p of products) {
      lines.push(`### ${p.name ?? p.slug}`);
      const meta: string[] = [];
      if (p.composition) meta.push(`Composizione: ${p.composition.trim()}`);
      if (p.dimensions) meta.push(`Dimensioni: ${p.dimensions.trim()}`);
      if (p.price) meta.push(`Prezzo: ${formatPrice(p.price)}`);
      if (meta.length > 0) {
        for (const m of meta) lines.push(`- ${m}`);
        lines.push('');
      }
      if (p.description_long) {
        const desc = p.description_long.trim().replace(/\s+/g, ' ');
        lines.push(desc.length > 500 ? desc.slice(0, 497) + '…' : desc);
        lines.push('');
      }
      lines.push(`URL: ${APP_URL}/prodotto/${p.slug}`);
      lines.push('');
    }
  }

  // --- Commercial category index (so AI engines point buyers to the right buy page) ---
  lines.push('## Categorie commerciali (pagine di acquisto)');
  lines.push('');
  lines.push('Pagine dove acquistare per tipo di prodotto, con prezzi e materiali:');
  lines.push(`- Foulard in seta di Como (da €75): ${APP_URL}/foulard-seta`);
  lines.push(`- Sciarpe in cashmere e lana (da €70): ${APP_URL}/sciarpe-seta`);
  lines.push(`- Pashmine in cashmere (da €120): ${APP_URL}/pashmine-cashmere`);
  lines.push(`- Camicie in lino (da €75): ${APP_URL}/camicie-lino`);
  lines.push(`- Teli mare in cotone (da €45): ${APP_URL}/teli-mare`);
  lines.push(`- Idee regalo in seta e cashmere: ${APP_URL}/regalo-seta-donna`);
  lines.push('');

  // --- Founder + entity ---
  lines.push('## Marco Dibenedetto — Founder');
  lines.push('');
  lines.push('Marco Dibenedetto è il fondatore di SILKinCOM. Maison comasca nata per portare il distretto serico del Lago di Como direttamente al cliente finale, senza la mediazione delle grandi maison. Bio editoriale completa, foto, contatti stampa:');
  lines.push(`- ${APP_URL}/maison/marco-dibenedetto`);
  lines.push(`- ${APP_URL}/la-nostra-storia`);
  lines.push(`- ${APP_URL}/press`);
  lines.push('');

  // --- Heritage references ---
  lines.push('## Riferimenti e fonti');
  lines.push('');
  lines.push('- Wikipedia — Como (capitale italiana della seta)');
  lines.push('- Mantero Seta (fondata 1902, Grandate Como)');
  lines.push('- Ratti Group (fondata 1945, Guanzate Como)');
  lines.push('- Camera di Commercio di Como — distretto serico');
  lines.push('- Museo della Seta di Como');
  lines.push('');

  // --- FAQ ---
  lines.push('## FAQ essenziali');
  lines.push('');
  lines.push('**Dove vengono prodotti i prodotti SILKinCOM?**');
  lines.push('SILKinCOM disegna e confeziona i propri prodotti nel distretto tessile di Como, Italia. La composizione e le specifiche di ogni articolo sono riportate nella relativa scheda prodotto.');
  lines.push('');
  lines.push('**Quanto costa la spedizione?**');
  lines.push('Italia: gratuita oltre €200, altrimenti €9. UE: gratuita oltre €350, altrimenti €18. Regno Unito, Svizzera e Norvegia: DDP €25. Altre destinazioni: tariffa indicata al checkout.');
  lines.push('');
  lines.push('**Come si lava una sciarpa in cashmere SILKinCOM?**');
  lines.push('Lavaggio a mano in acqua fredda con shampoo neutro o detergente specifico per cashmere. Niente strofinare, niente strizzare. Asciugare in piano su un asciugamano, lontano da fonti di calore dirette. Guida completa: ' + APP_URL + '/cura-prodotto/cashmere.');
  lines.push('');
  lines.push('**Come riconoscere una seta autentica?**');
  lines.push('7 prove pratiche (tatto, lucentezza naturale, calore di sfregamento, suono al pizzicotto, prova della fiamma, controllo etichette) descritte nell\'articolo dedicato: ' + APP_URL + '/trame-di-como/come-riconoscere-seta-vera.');
  lines.push('');
  lines.push('**Posso restituire un prodotto?**');
  lines.push('Sì, entro 14 giorni dalla consegna (D.Lgs. 21/2014). Nel recesso volontario le spese dirette di restituzione sono a carico del cliente. Se il prodotto è errato, difettoso o non conforme per responsabilità di SILKinCOM, la restituzione è gratuita e a carico della Maison. Procedura: ' + APP_URL + '/resi.');
  lines.push('');

  lines.push('---');
  lines.push(`Ultimo aggiornamento corpus: ${new Date().toISOString().slice(0, 10)}.`);
  lines.push(`Index spec-compliant: ${APP_URL}/llms.txt`);
  lines.push('');

  return lines.join('\n');
}

const getCachedCorpus = unstable_cache(
  async () => {
    const { products, materials } = await fetchCorpusData();
    return buildCorpus(products, materials);
  },
  ['llms-full-corpus'],
  { revalidate: 3600, tags: ['products', 'home-materials'] }
);

export async function GET() {
  const text = await getCachedCorpus();
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
