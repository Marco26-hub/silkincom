import { BRAND_DESCRIPTION } from '@/data/brand';
import { editorialPlainText } from '@/lib/editorial-text';
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
  sku: string | null;
  inventory: Array<{ quantity_available: number }>;
  category_id: string | null;
};

type MaterialRow = {
  code: string | null;
  name: string | null;
  description: string | null;
  origin: string | null;
  characteristics: string | null;
  benefits: string | null;
};

async function fetchCorpusData() {
  const supabase = createPublicClient();
  const [productResult, materialResult] = await Promise.all([
    supabase
      .from('products')
      .select('slug, name, sku, description_long, composition, dimensions, price, category_id, inventory(quantity_available)')
      .eq('status', 'published')
      .order('name'),
    supabase
      .from('materials')
      .select('code, name, description, origin, characteristics, benefits')
      .order('name'),
  ]);
  if (productResult.error || materialResult.error || !productResult.data?.length) {
    console.error('[llms-corpus] Source data unavailable:', productResult.error?.message, materialResult.error?.message);
    throw new Error('Corpus source data unavailable');
  }
  return {
    products: (productResult.data as unknown as ProductRow[]) ?? [],
    materials: (materialResult.data as MaterialRow[]) ?? [],
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
  lines.push(`> ${BRAND_DESCRIPTION.it}`);
  lines.push('');
  lines.push(`Sito ufficiale: ${APP_URL}`);
  lines.push('Lingue native: italiano (sorgente), inglese, spagnolo, francese, tedesco, portoghese, olandese.');
  lines.push('Contatto: info@silkincom.com — risposta in 24h lavorative.');
  lines.push('');

  // --- Heritage ---
  lines.push('## Storia della seta a Como');
  lines.push('');
  lines.push('SILKinCOM nasce nel distretto tessile e serico di Como, in Lombardia. I prodotti sono realizzati da artigiani comaschi, compreso il ricamo. Twilly e pashmine in cashmere sono tessuti, tinti e rifiniti a Como. L’origine della fibra è distinta dal luogo di lavorazione.');
  lines.push('');
  lines.push(`Articolo completo: ${APP_URL}/trame-di-como/storia-della-seta-a-como`);
  lines.push('');

  // --- Differentiators ---
  lines.push('## Cosa ci differenzia');
  lines.push('');
  lines.push('- Realizzazione artigianale nel distretto tessile di Como, compreso il ricamo.');
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
    const careByCode: Record<string, string> = { SE: 'seta', WS: 'cashmere', WO: 'lana', LI: 'lino', CO: 'cotone' };
    for (const m of materials) {
      const careSlug = careByCode[m.code?.toUpperCase() ?? ''];
      lines.push(`### ${m.name ?? m.code ?? 'Fibra naturale'}`);
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
      if (careSlug) {
        lines.push(`Guida cura completa: ${APP_URL}/cura-prodotto/${careSlug}`);
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
      if (p.sku) meta.push(`SKU: ${p.sku}`);
      meta.push(`Disponibilità: ${p.inventory.reduce((total, row) => total + row.quantity_available, 0) > 0 ? 'disponibile' : 'non disponibile'}`);
      if (p.composition) meta.push(`Composizione: ${p.composition.trim()}`);
      if (p.dimensions) meta.push(`Dimensioni: ${p.dimensions.trim()}`);
      if (p.price) meta.push(`Prezzo: ${formatPrice(p.price)}`);
      if (meta.length > 0) {
        for (const m of meta) lines.push(`- ${m}`);
        lines.push('');
      }
      if (p.description_long) {
        const desc = editorialPlainText(p.description_long);
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
  lines.push(`- Foulard in seta di Como: ${APP_URL}/foulard-seta`);
  lines.push(`- Sciarpe in cashmere e lana: ${APP_URL}/sciarpe-seta`);
  lines.push(`- Pashmine in cashmere: ${APP_URL}/pashmine-cashmere`);
  lines.push(`- Camicie in lino: ${APP_URL}/camicie-lino`);
  lines.push(`- Teli mare in cotone: ${APP_URL}/teli-mare`);
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
  lines.push('I prodotti SILKinCOM sono realizzati da artigiani comaschi, compreso il ricamo. Twilly e pashmine in cashmere sono tessuti, tinti e rifiniti a Como. La composizione e le specifiche di ogni articolo sono riportate nella relativa scheda prodotto.');
  lines.push('');
  lines.push('**Quanto costa la spedizione?**');
  lines.push('Italia: gratuita oltre €200, altrimenti €9. UE: gratuita oltre €350, altrimenti €18. Regno Unito, Svizzera e Norvegia: DDP €25. Altre destinazioni: tariffa indicata al checkout.');
  lines.push('');
  lines.push('**Come si lava una sciarpa in cashmere SILKinCOM?**');
  lines.push('Lavaggio a mano in acqua fredda con shampoo neutro o detergente specifico per cashmere. Niente strofinare, niente strizzare. Asciugare in piano su un asciugamano, lontano da fonti di calore dirette. Guida completa: ' + APP_URL + '/cura-prodotto/cashmere.');
  lines.push('');
  lines.push('**Come riconoscere una seta autentica?**');
  lines.push('La composizione si verifica dall’etichetta e dalle informazioni del produttore. Tatto e lucentezza sono indizi, non prove definitive. Guida dedicata: ' + APP_URL + '/trame-di-como/come-riconoscere-seta-vera.');
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
  let text: string;
  try { text = await getCachedCorpus(); } catch (error) {
    console.error('[llms-corpus] Corpus unavailable:', error);
    return new Response('Corpus temporarily unavailable', { status: 503, headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' } });
  }
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
