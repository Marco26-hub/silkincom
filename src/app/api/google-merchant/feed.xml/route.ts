/**
 * Google Merchant Center product feed (RSS 2.0 + Google namespace).
 *
 * Endpoint: /api/google-merchant/feed.xml
 *
 * Setup:
 * 1. Merchant Center → Products → Add data source → Scheduled fetch
 * 2. URL: https://silkincom.com/api/google-merchant/feed.xml
 * 3. Frequency: Daily
 *
 * Includes: id, title, description, link, image_link, price, availability,
 * brand, condition, gtin (when available), product_type, identifier_exists.
 */
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

export async function GET() {
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

    const desc = p.description_long || p.description_short || `${p.name} — Made in Como`;

    return `
    <item>
      <g:id>${escapeXml(p.sku || p.id)}</g:id>
      <g:title>${cdata(`${p.name} — SILKinCOM`)}</g:title>
      <g:description>${cdata(desc)}</g:description>
      <g:link>${APP_URL}/prodotto/${escapeXml(p.slug)}</g:link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>
      ${additionalImages.map((u: string) => `<g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`).join('\n      ')}
      <g:availability>${availability}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} ${p.currency || 'EUR'}</g:price>
      ${p.compare_at_price ? `<g:sale_price>${Number(p.price).toFixed(2)} ${p.currency || 'EUR'}</g:sale_price>` : ''}
      <g:brand>${BRAND}</g:brand>
      <g:condition>new</g:condition>
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SILKinCOM Product Feed</title>
    <link>${APP_URL}</link>
    <description>Sciarpe, foulard e accessori in seta e cashmere — Made in Como</description>
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
