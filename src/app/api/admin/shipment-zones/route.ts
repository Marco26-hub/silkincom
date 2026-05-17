import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

function parseCountries(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { name, countries, base_cost, free_shipping_threshold, estimated_days } = body;

    const parsedCountries = parseCountries(countries);

    if (!name || parsedCountries.length === 0 || base_cost == null) {
      return NextResponse.json({ error: 'Nome, paesi e costo base richiesti' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const insert = {
      name: name.trim(),
      countries: parsedCountries,
      base_cost: Number(base_cost),
      free_shipping_threshold: free_shipping_threshold ? Number(free_shipping_threshold) : null,
      estimated_days: estimated_days ? Number(estimated_days) : null,
    };

    const { data, error } = await supabase
      .from('shipment_zones')
      .insert(insert)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Nome zona già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create_shipment_zone', 'shipment_zone', data.id, insert);

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
