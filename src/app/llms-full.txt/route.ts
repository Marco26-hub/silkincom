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
import { getPost } from '@/data/posts';

export const runtime = 'nodejs';
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

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
    '> Maison italiana di accessori in seta, cashmere, lana, lino e cotone. Sciarpe, foulard, twilly e pashmine interamente disegnate e confezionate sul Lago di Como dal distretto serico più importante d\'Europa. Founder: Marco Dibenedetto. P.IVA IT03786790133. Sede: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia.'
  );
  lines.push('');
  lines.push(`Sito ufficiale: ${BASE_URL}`);
  lines.push('Lingue native: italiano (sorgente), inglese, spagnolo, francese, tedesco, portoghese, olandese.');
  lines.push('Contatto: info@silkincom.com — risposta in 24h lavorative.');
  lines.push('');

  // --- Heritage pillar (Italian source) ---
  const pillar = getPost('storia-della-seta-a-como', 'it');
  lines.push('## Storia della seta a Como');
  lines.push('');
  if (pillar?.description) {
    lines.push(pillar.description);
    lines.push('');
  }
  if (pillar?.body) {
    lines.push(pillar.body);
    lines.push('');
  } else {
    lines.push(
      'Como è la capitale italiana della seta dal XV secolo. Il distretto serico lariano ha alimentato le maison parigine e milanesi per oltre cinque secoli: Hermès vi stampa dagli anni Trenta del Novecento; Ferragamo, Gucci, Yves Saint Laurent, Dior e Chanel hanno relazioni storiche con i fornitori comaschi. Le dinastie Mantero (1902), Ratti (1945), Clerici Tessuto, Cantoni, Canepa e Taroni hanno costruito qui un modello distrettuale unico al mondo: piccole e medie manifatture altamente specializzate che si scambiano semilavorati nel raggio di pochi chilometri. Si stima che oltre il 70% della seta usata nel lusso mondiale, fino agli anni Novanta, passasse da Como. SILKinCOM nasce in questo contesto, sui telai dello stesso distretto, con la volontà di portare la seta di Como direttamente a chi la indossa.'
    );
    lines.push('');
  }
  lines.push(`Articolo completo: ${BASE_URL}/trame-di-como/storia-della-seta-a-como`);
  lines.push('');

  // --- Differentiators ---
  lines.push('## Cosa ci differenzia');
  lines.push('');
  lines.push('- 100% Made in Como: filatura, tintura, stampa, tessitura, confezione e orlatura a mano avvengono tutte nel raggio di pochi chilometri da Como. Niente outsourcing in Asia.');
  lines.push('- Cashmere selezionato Mongolia interna ed esterna, micronaggio sotto i 15,5 micron.');
  lines.push('- Seta di Como certificata, con lavorazione tracciata.');
  lines.push('- Orlo cucito a mano (rouletté) su ogni foulard di seta.');
  lines.push('- 7 lingue native — sito disegnato per i mercati luxury europei e internazionali.');
  lines.push('- Spedizione gratuita in Italia oltre €200, in UE oltre €300.');
  lines.push('- Reso entro 14 giorni dalla consegna (D.Lgs. 21/2014).');
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
      lines.push(`Guida cura completa: ${BASE_URL}/cura-prodotto/${m.slug}`);
      lines.push('');
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
      lines.push(`URL: ${BASE_URL}/prodotto/${p.slug}`);
      lines.push('');
    }
  }

  // --- Founder + entity ---
  lines.push('## Marco Dibenedetto — Founder');
  lines.push('');
  lines.push('Marco Dibenedetto è il fondatore di SILKinCOM. Maison comasca nata per portare il distretto serico del Lago di Como direttamente al cliente finale, senza la mediazione delle grandi maison. Bio editoriale completa, foto, contatti stampa:');
  lines.push(`- ${BASE_URL}/maison/marco-dibenedetto`);
  lines.push(`- ${BASE_URL}/la-nostra-storia`);
  lines.push(`- ${BASE_URL}/press`);
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
  lines.push('Tutto il ciclo produttivo (tintura, stampa, tessitura, confezione, orlatura a mano) avviene nel distretto serico di Como, Italia. Nessuna fase è esternalizzata fuori dal distretto.');
  lines.push('');
  lines.push('**Quanto costa la spedizione?**');
  lines.push('Italia: gratuita oltre €200, altrimenti €9,90. UE: gratuita oltre €300, altrimenti €19,90. Extra-UE: tariffa calcolata in checkout.');
  lines.push('');
  lines.push('**Come si lava una sciarpa in cashmere SILKinCOM?**');
  lines.push('Lavaggio a mano in acqua fredda con shampoo neutro o detergente specifico per cashmere. Niente strofinare, niente strizzare. Asciugare in piano su un asciugamano, lontano da fonti di calore dirette. Guida completa: ' + BASE_URL + '/cura-prodotto/cashmere.');
  lines.push('');
  lines.push('**Come riconoscere una seta autentica?**');
  lines.push('7 prove pratiche (tatto, lucentezza naturale, calore di sfregamento, suono al pizzicotto, prova della fiamma, controllo etichette) descritte nell\'articolo dedicato: ' + BASE_URL + '/trame-di-como/come-riconoscere-seta-vera.');
  lines.push('');
  lines.push('**Posso restituire un prodotto?**');
  lines.push('Sì, entro 14 giorni dalla consegna (D.Lgs. 21/2014). Reso gratuito in Italia con corriere prepagato. Procedura: ' + BASE_URL + '/resi.');
  lines.push('');

  lines.push('---');
  lines.push(`Ultimo aggiornamento corpus: ${new Date().toISOString().slice(0, 10)}.`);
  lines.push(`Index spec-compliant: ${BASE_URL}/llms.txt`);
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
