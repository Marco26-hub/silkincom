/**
 * Seed prodotti da products.json a Supabase DB.
 * Esegui con: npx tsx scripts/seed-products.ts
 *
 * Richiede: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js';
import productsJson from '../src/data/products.json';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type RawProduct = {
  slug: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  composition: string;
  dimensions: string;
  images: string[];
};

async function main() {
  const products = productsJson as RawProduct[];
  console.log(`Seeding ${products.length} products...`);

  for (const p of products) {
    const { data: product, error } = await supabase
      .from('products')
      .upsert(
        {
          slug: p.slug,
          name: p.name,
          sku: p.sku,
          price: p.price,
          description_long: p.description,
          composition: p.composition,
          dimensions: p.dimensions,
          status: 'published',
          currency: 'EUR',
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (error || !product) {
      console.error(`Error seeding ${p.slug}:`, error);
      continue;
    }

    // Seed images
    if (p.images?.length) {
      await supabase.from('product_images').delete().eq('product_id', product.id);
      const images = p.images.map((url, idx) => ({
        product_id: product.id,
        image_url: url,
        alt_text: p.name,
        display_order: idx,
        is_primary: idx === 0,
      }));
      await supabase.from('product_images').insert(images);
    }

    // Seed inventory (default 50 units)
    await supabase.from('inventory').upsert(
      {
        product_id: product.id,
        quantity_total: 50,
        quantity_available: 50,
        quantity_reserved: 0,
      },
      { onConflict: 'product_id' }
    );

    console.log(`✓ ${p.slug}`);
  }

  console.log('Done.');
}

main().catch(console.error);
