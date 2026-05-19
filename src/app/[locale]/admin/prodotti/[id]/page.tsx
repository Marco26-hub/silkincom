import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { ProductEditForm } from '@/components/admin/ProductEditForm';
import { ProductImageGallery } from '@/components/admin/ProductImageGallery';

export const dynamic = 'force-dynamic';

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [
    { data: product },
    { data: categories },
    { data: collections },
    { data: compositions },
    { data: sizes },
    { data: colors },
    { data: materials },
    { data: variants },
  ] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('collections').select('id, name').eq('is_active', true).order('name'),
    supabase.from('compositions').select('id, name').order('name'),
    supabase.from('product_sizes').select('id, name').order('name'),
    supabase.from('colors').select('id, name, hex_code').order('name'),
    supabase.from('materials').select('id, name').order('name'),
    supabase.from('product_variants').select('id, variant_sku, variant_name, price_override, color_id, material_id').eq('product_id', id).order('created_at'),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6 max-w-[900px]">
      <Link href="/admin/prodotti" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" />
        Tutti i prodotti
      </Link>

      <h1 className="font-display text-4xl">{product.name}</h1>

      <ProductImageGallery productId={product.id} />

      <ProductEditForm
        product={product}
        initialCategories={categories ?? []}
        initialCollections={collections ?? []}
        initialCompositions={compositions ?? []}
        initialSizes={sizes ?? []}
        initialColors={colors ?? []}
        initialMaterials={materials ?? []}
        initialVariants={variants ?? []}
      />
    </div>
  );
}
