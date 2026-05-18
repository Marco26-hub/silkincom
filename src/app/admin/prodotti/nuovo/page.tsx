import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { NuovoProdottoForm } from './NuovoProdottoForm';

export const dynamic = 'force-dynamic';

export default async function NuovoProdottoPage() {
  const supabase = createServiceClient();

  const [
    { data: categories },
    { data: collections },
    { data: compositions },
    { data: sizes },
    { data: colors },
    { data: materials },
  ] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('collections').select('id, name').eq('is_active', true).order('name'),
    supabase.from('compositions').select('id, name').order('name'),
    supabase.from('product_sizes').select('id, name').order('name'),
    supabase.from('colors').select('id, name, hex_code').order('name'),
    supabase.from('materials').select('id, name').order('name'),
  ]);

  return (
    <div className="space-y-6 max-w-[900px]">
      <Link href="/admin/prodotti" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" />
        Tutti i prodotti
      </Link>

      <h1 className="font-display text-4xl">Nuovo prodotto</h1>

      <NuovoProdottoForm
        initialCategories={categories ?? []}
        initialCollections={collections ?? []}
        initialCompositions={compositions ?? []}
        initialSizes={sizes ?? []}
        initialColors={colors ?? []}
        initialMaterials={materials ?? []}
      />
    </div>
  );
}
