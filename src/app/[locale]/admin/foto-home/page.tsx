import { createServiceClient } from '@/lib/supabase/server';
import { HomeSlidesManager } from '@/components/admin/HomeSlidesManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Foto Home — Admin SILKinCOM', robots: { index: false } };

export default async function AdminHomeSlidesPage() {
  const supabase = createServiceClient();
  const { data: slides } = await supabase
    .from('home_slides')
    .select('*')
    .order('display_order', { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light mb-2">Foto Home</h1>
        <p className="text-sm text-soft-grey max-w-2xl">
          Gestisci le slide del carosello in homepage. Foto, titolo e sottotitolo si traducono
          automaticamente in 7 lingue (italiano → en/es/fr/de/pt/nl) tramite OpenRouter al salvataggio.
          Usa <code className="px-1 bg-pearl-grey/40 rounded">||</code> nel titolo per separare la riga
          principale dalla riga in corsivo oro (es: <code className="px-1 bg-pearl-grey/40 rounded">L&apos;eleganza del lago||tessuta a Como.</code>).
        </p>
      </div>
      <HomeSlidesManager initialSlides={slides || []} />
    </div>
  );
}
