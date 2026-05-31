/**
 * Google Merchant Center product feed (RSS 2.0 + Google namespace).
 *
 * Endpoint: /api/google-merchant/feed.xml          → Italian (default)
 *           /api/google-merchant/feed.xml?lang=en  → English
 *
 * Setup:
 * 1. Merchant Center → Products → Add data source → Scheduled fetch
 * 2. IT: https://www.silkincom.com/api/google-merchant/feed.xml
 *    EN: https://www.silkincom.com/api/google-merchant/feed.xml?lang=en
 * 3. Frequency: Daily
 *
 * Includes: id, title, description, link, image_link, price, availability,
 * brand, condition, color, gender, age_group, material, product_type,
 * identifier_exists.
 */
import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';
export const revalidate = 3600;

const BRAND = 'SILKinCOM';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(text: string): string {
  return `<![CDATA[${(text || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

// Google Merchant requires color / material / gender / age_group to avoid
// "missing attribute" warnings. Colors are not stored as structured data
// (product_colors is empty), so we derive them from the Italian product name
// (the colour is the trailing token, e.g. "Varenna Azzurra" → Light Blue) plus
// a few explicit overrides where the name is a style, not a colour.
const COLOR_IT_EN: Record<string, string> = {
  azzurra: 'Light Blue', azzurro: 'Light Blue',
  beige: 'Beige',
  grigia: 'Grey', grigio: 'Grey',
  bianco: 'White', bianca: 'White',
  blu: 'Blue', navy: 'Navy',
  nero: 'Black', nera: 'Black',
  verde: 'Green', rosa: 'Pink', viola: 'Purple',
  cipria: 'Powder Pink',
};

function resolveColor(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.startsWith('bellagio')) return 'Powder Pink'; // "Cipria", logo colour is just a variant
  if (n.startsWith('como ')) return 'Blue';           // Como silk twillys are blue
  if (n === 'tivan') return 'Turquoise';              // turquoise beach towel
  if (n.includes('blu navy')) return 'Navy';
  if (n.includes('grigio melange')) return 'Grey';
  const tokens = n.replace(/[—–-]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (COLOR_IT_EN[tokens[i]]) return COLOR_IT_EN[tokens[i]];
  }
  return 'Multicolor';
}

// Primary fibre, translated to English. composition is e.g. "100% cashmere",
// "53% lino, 47% cotone", "Frontale 100% cotone, retro 100% poliestere" — the
// first fibre listed is the dominant one.
const FIBER_IT_EN: Record<string, string> = {
  seta: 'Silk', cotone: 'Cotton', lana: 'Wool', lino: 'Linen',
  cashmere: 'Cashmere', poliestere: 'Polyester', elastan: 'Elastane',
};

function resolveMaterial(composition?: string): string {
  const c = (composition || '').toLowerCase();
  let best: { idx: number; en: string } | null = null;
  for (const [it, en] of Object.entries(FIBER_IT_EN)) {
    const idx = c.indexOf(it);
    if (idx >= 0 && (best === null || idx < best.idx)) best = { idx, en };
  }
  return best ? best.en : 'Silk';
}

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'it';
  const supabase = createServiceClient();

  // NB: the inventory column is `quantity_available` (not `available_quantity`).
  // The previous typo silently returned an empty result set from PostgREST,
  // which is why Google Merchant Center was fetching an empty feed and the
  // product URLs it still indexed pointed at the old Wix product pages
  // (since the new ones never reached Google).
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, sku, price, compare_at_price, currency,
      description_short, description_long, composition,
      name_i18n, description_short_i18n, description_long_i18n,
      product_images(image_url, is_primary, display_order),
      inventory(quantity_available)
    `)
    .eq('status', 'published');

  if (error) {
    console.error('google-merchant feed query failed:', error);
  }

  const items = (products || []).map((p: any) => {
    const sortedImages = (p.product_images || []).sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });
    const primaryImage = sortedImages[0]?.image_url || `${APP_URL}/og-image.jpg`;
    const additionalImages = sortedImages.slice(1, 11).map((i: any) => i.image_url);

    // Total stock across all variants of the product (apparel ships in S–XXL
    // so a product is "in stock" if any size has quantity).
    const stock = (p.inventory || []).reduce(
      (sum: number, row: any) => sum + (row?.quantity_available ?? 0),
      0,
    );
    const availability = stock > 0 ? 'in_stock' : 'out_of_stock';

    // Resolve localised fields: prefer i18n value for requested lang, fallback to base field.
    const title = (lang === 'en'
      ? p.name_i18n?.en
      : p.name_i18n?.it) || p.name;
    const desc = (lang === 'en'
      ? (p.description_long_i18n?.en || p.description_short_i18n?.en)
      : (p.description_long_i18n?.it || p.description_short_i18n?.it))
      || p.description_long
      || p.description_short
      || `${title} — Made in Como`;

    return `
    <item>
      <g:id>${escapeXml(p.sku || p.id)}</g:id>
      <g:title>${cdata(`${title} — SILKinCOM`)}</g:title>
      <g:description>${cdata(desc)}</g:description>
      <g:link>${APP_URL}/prodotto/${escapeXml(p.slug)}</g:link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>
      ${additionalImages.map((u: string) => `<g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`).join('\n      ')}
      <g:availability>${availability}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} ${p.currency || 'EUR'}</g:price>
      ${p.compare_at_price ? `<g:sale_price>${Number(p.price).toFixed(2)} ${p.currency || 'EUR'}</g:sale_price>` : ''}
      <g:brand>${BRAND}</g:brand>
      <g:condition>new</g:condition>
      <g:color>${escapeXml(resolveColor(p.name))}</g:color>
      <g:gender>unisex</g:gender>
      <g:age_group>adult</g:age_group>
      <g:material>${escapeXml(resolveMaterial(p.composition))}</g:material>
      <g:identifier_exists>false</g:identifier_exists>
      <g:product_type>Apparel &amp; Accessories &gt; Clothing Accessories &gt; Scarves &amp; Shawls</g:product_type>
      <g:google_product_category>1786</g:google_product_category>
      <g:mpn>${escapeXml(p.sku || p.id)}</g:mpn>
      <g:custom_label_0>made-in-como</g:custom_label_0>
      <g:custom_label_1>${escapeXml(p.composition || 'silk')}</g:custom_label_1>
      <g:shipping>
        <g:country>IT</g:country>
        <g:service>Standard</g:service>
        <g:price>${Number(p.price) >= 200 ? '0.00' : '9.00'} EUR</g:price>
      </g:shipping>
    </item>`;
  }).join('');

  const channelDesc = lang === 'en'
    ? 'Scarves, foulards and silk &amp; cashmere accessories — Made in Como'
    : 'Sciarpe, foulard e accessori in seta e cashmere — Made in Como';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SILKinCOM Product Feed</title>
    <link>${APP_URL}</link>
    <description>${channelDesc}</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
