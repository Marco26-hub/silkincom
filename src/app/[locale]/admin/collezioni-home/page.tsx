import { createServiceClient } from '@/lib/supabase/server';
import { CollectionsContentManager } from '@/components/admin/CollectionsContentManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Collezioni Home — Admin SILKinCOM', robots: { index: false } };

export default async function AdminCollectionsContentPage() {
  const supabase = createServiceClient();
  const { data: collections } = await supabase
    .from('collections')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light mb-2">Collezioni — Sezione Home</h1>
        <p className="text-sm text-soft-grey max-w-2xl">
          Gestisci nome, sottotitolo, descrizione, immagine e badge "accent" delle collezioni mostrate
          in homepage (sezione &quot;Le nostre Collezioni&quot;). Auto-traduzione 7 lingue al salvataggio
          via OpenRouter. Le foto vengono caricate su bucket Supabase Storage <code>collections</code>.
        </p>
      </div>
      <CollectionsContentManager initial={collections || []} />
    </div>
  );
}
