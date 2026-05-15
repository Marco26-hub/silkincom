import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*), inventory(quantity_available)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !product) {
    return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });
  }

  return NextResponse.json({ product });
}
