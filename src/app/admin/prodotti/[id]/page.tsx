import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { ProductEditForm } from '@/components/admin/ProductEditForm';
import { ProductImageGallery } from '@/components/admin/ProductImageGallery';

export const dynamic = 'force-dynamic';

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  if (!product) notFound();

  return (
    <div className="space-y-6 max-w-[900px]">
      <Link href="/admin/prodotti" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" />
        Tutti i prodotti
      </Link>

      <h1 className="font-display text-4xl">{product.name}</h1>

      <ProductImageGallery productId={product.id} />

      <ProductEditForm product={product} />
    </div>
  );
}
