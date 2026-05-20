import { createServiceClient } from '@/lib/supabase/server';
import { HomeSectionsManager } from '@/components/admin/HomeSectionsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sezioni Home — Admin SILKinCOM', robots: { index: false } };

export default async function AdminHomeSectionsPage() {
  const supabase = createServiceClient();
  const { data: sections } = await supabase
    .from('home_sections')
    .select('*')
    .order('section_key');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light mb-2">Sezioni Home</h1>
        <p className="text-sm text-soft-grey max-w-2xl">
          Gestisci testi e immagini delle 3 sezioni hardcoded della homepage:
          Brand Story, Editorial Banner (atelier), Instagram Feed. Auto-traduzione
          7 lingue al salvataggio via OpenRouter. Foto su bucket Storage <code>home-content</code>.
        </p>
      </div>
      <HomeSectionsManager initial={sections || []} />
    </div>
  );
}
