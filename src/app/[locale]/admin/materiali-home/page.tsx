import { createServiceClient } from '@/lib/supabase/server';
import { HomeMaterialsManager } from '@/components/admin/HomeMaterialsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Materiali Home — Admin SILKinCOM', robots: { index: false } };

export default async function AdminHomeMaterialsPage() {
  const supabase = createServiceClient();
  const { data: materials } = await supabase
    .from('materials')
    .select(`id, slug, code, href, image_url, storage_path, display_order, is_active,
             name_i18n, description_i18n,
             origin_title_i18n, origin_body_i18n,
             characteristics_title_i18n, characteristics_body_i18n,
             benefit_title_i18n, benefit_body_i18n`)
    .not('slug', 'is', null)
    .order('display_order', { ascending: true, nullsFirst: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light mb-2">Materiali — Sezione Home</h1>
        <p className="text-sm text-soft-grey max-w-2xl">
          Gestisci le 5 card materiali della homepage (Seta, Cashmere, Lana, Cotone, Lino).
          Modifica nome, descrizione e i 3 tab (Origine, Caratteristiche, Beneficio) per
          ogni materiale. Auto-traduzione 7 lingue al salvataggio.
        </p>
      </div>
      <HomeMaterialsManager initial={materials || []} />
    </div>
  );
}
