/**
 * POST /api/admin/inventory/cost  (admin)
 *
 * Sets the purchase cost accounting for a product: `cost_price` (net purchase
 * cost, € IVA esclusa) and `purchase_vat_rate` (%). Used by the warehouse
 * ProductCostForm so the admin can track real margin per article.
 *
 * Body: { product_id: string, cost_price: number, purchase_vat_rate?: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { revalidateCatalog } from '@/lib/revalidate';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as {
    product_id?: string;
    cost_price?: number | string | null;
    purchase_vat_rate?: number | string | null;
  };

  if (!body.product_id) {
    return NextResponse.json({ error: 'product_id richiesto' }, { status: 400 });
  }

  // cost_price: allow clearing (null) or any non-negative number.
  let cost: number | null = null;
  if (body.cost_price !== null && body.cost_price !== undefined && body.cost_price !== '') {
    cost = Number(body.cost_price);
    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: 'cost_price non valido' }, { status: 400 });
    }
  }

  // purchase_vat_rate: 0–100, default left untouched if absent.
  const update: { cost_price: number | null; purchase_vat_rate?: number } = { cost_price: cost };
  if (body.purchase_vat_rate !== null && body.purchase_vat_rate !== undefined && body.purchase_vat_rate !== '') {
    const vat = Number(body.purchase_vat_rate);
    if (!Number.isFinite(vat) || vat < 0 || vat > 100) {
      return NextResponse.json({ error: 'purchase_vat_rate non valido (0–100)' }, { status: 400 });
    }
    update.purchase_vat_rate = vat;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('products').update(update).eq('id', body.product_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateCatalog();
  return NextResponse.json({ ok: true, product_id: body.product_id, ...update });
}
