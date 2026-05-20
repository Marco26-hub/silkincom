import { createServiceClient } from '@/lib/supabase/server';
import { StaticPagesManager } from '@/components/admin/StaticPagesManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagine Statiche — Admin SILKinCOM', robots: { index: false } };

export default async function AdminStaticPagesPage() {
  const supabase = createServiceClient();
  const { data: pages } = await supabase
    .from('static_pages')
    .select('*')
    .order('page_key');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light mb-2">Pagine Statiche</h1>
        <p className="text-sm text-soft-grey max-w-3xl">
          Editor block-based per le 8 pagine statiche: La nostra storia, Atelier, B2B, Artigiani, Press,
          FAQ, Maison · Marco Dibenedetto, Cura del prodotto. Modifica titolo + meta SEO + blocchi
          contenuto (hero / sezione / immagine+testo / galleria / CTA / citazione / lista / FAQ).
          Auto-traduzione 7 lingue al salvataggio via OpenRouter. Foto su bucket Supabase Storage{' '}
          <code>home-content</code> (path <code>pages/&lt;key&gt;/</code>).
        </p>
      </div>
      <StaticPagesManager initial={pages || []} />
    </div>
  );
}
