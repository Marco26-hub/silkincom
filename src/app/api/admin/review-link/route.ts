import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { signReviewToken } from '@/lib/review-token';
import { APP_URL } from '@/lib/app-url';

/**
 * Admin-only helper: returns the guest review link(s) for an order, so we can
 * personally nudge a customer (e.g. on WhatsApp) instead of relying on the
 * automated post-delivery email. The link carries a signed `rt` token that
 * lets the customer review WITHOUT an account. Open in a browser while logged
 * in as admin: /api/admin/review-link?order=SK-20260602-0038
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export async function GET(req: NextRequest) {
  // Gate: must be a signed-in admin (same pattern as /api/admin/analytics).
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const orderNumber = req.nextUrl.searchParams.get('order');
  if (!orderNumber) {
    return NextResponse.json({ error: 'missing ?order=<order_number>' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: order } = await svc
    .from('orders')
    .select('id, customer_email, order_number')
    .eq('order_number', orderNumber)
    .single();
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  const { data: items } = await svc
    .from('order_items')
    .select('product_name, product_slug')
    .eq('order_id', order.id);

  const links = (items ?? [])
    .filter((i) => i.product_slug)
    .map((i) => ({
      product: i.product_name as string,
      url: `${APP_URL}/prodotto/${encodeURIComponent(i.product_slug as string)}?rt=${encodeURIComponent(
        signReviewToken(order.customer_email as string, i.product_slug as string),
      )}#review`,
    }));

  if (!links.length) {
    return NextResponse.json({ error: 'no reviewable items on this order' }, { status: 404 });
  }

  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link recensione · ${esc(order.order_number)}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:48px auto;padding:0 20px;color:#1a1a1a;line-height:1.6">
<h2 style="font-weight:600">Link recensione — ${esc(order.order_number)}</h2>
<p style="color:#666">Cliente: <b>${esc(order.customer_email)}</b> · il link NON scade, permette di recensire senza account.</p>
${links
  .map(
    (l) => `<div style="margin:20px 0">
  <div style="font-weight:600;margin-bottom:6px">${esc(l.product)}</div>
  <input readonly value="${esc(l.url)}" onclick="this.select()"
    style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-family:monospace;font-size:13px">
</div>`,
  )
  .join('')}
<p style="color:#999;font-size:13px;margin-top:32px">Clicca sul campo per selezionare, poi copia (Cmd/Ctrl+C).</p>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
