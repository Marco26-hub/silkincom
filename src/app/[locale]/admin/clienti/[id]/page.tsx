import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { ArrowLeft, Check, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAID_STATES = ['paid', 'processing', 'shipped', 'delivered'];

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function ConsentRow({ label, on, at }: { label: string; on: boolean; at?: string | null }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <dt className="text-soft-grey">{label}</dt>
      <dd className="flex items-center gap-1.5">
        {on ? (
          <span className="inline-flex items-center gap-1 text-green-700">
            <Check className="w-3.5 h-3.5" /> Sì
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-soft-grey">
            <X className="w-3.5 h-3.5" /> No
          </span>
        )}
        {at && <span className="text-soft-grey">· {new Date(at).toLocaleDateString('it-IT')}</span>}
      </dd>
    </div>
  );
}

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at')
    .eq('id', id)
    .single();
  if (!profile) notFound();

  const { data: customer } = await supabase
    .from('customers')
    .select(
      'preferred_language, newsletter_consent, newsletter_consent_at, marketing_consent, marketing_consent_at',
    )
    .eq('id', id)
    .maybeSingle();

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('id, type, full_name, phone, street_address, city, postal_code, country, is_default')
    .eq('customer_id', id);

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, status, payment_status, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });

  const { data: newsletter } = await supabase
    .from('newsletter_subscribers')
    .select('is_subscribed, is_confirmed')
    .ilike('email', profile.email)
    .maybeSingle();

  const orderList = orders ?? [];
  const paidOrders = orderList.filter((o) => PAID_STATES.includes(o.status));
  const totalSpent = paidOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const lastOrder = orderList[0]?.created_at ?? null;

  return (
    <div className="space-y-6 max-w-[1100px]">
      <Link
        href="/admin/clienti"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Tutti i clienti
      </Link>

      <div>
        <h1 className="font-display text-4xl mb-1">{profile.full_name ?? 'Cliente'}</h1>
        <p className="text-soft-grey text-sm">{profile.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-pearl-grey bg-white p-5">
          <p className="text-2xl font-display">{paidOrders.length}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mt-1">Ordini</p>
        </div>
        <div className="border border-pearl-grey bg-white p-5">
          <p className="text-2xl font-display">{fmt(totalSpent)}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mt-1">Speso totale</p>
        </div>
        <div className="border border-pearl-grey bg-white p-5">
          <p className="text-2xl font-display">
            {lastOrder ? new Date(lastOrder).toLocaleDateString('it-IT') : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mt-1">Ultimo ordine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Purchase history */}
        <section className="border border-pearl-grey bg-white">
          <header className="px-6 py-4 border-b border-pearl-grey">
            <h2 className="font-medium text-sm">Storico acquisti ({orderList.length})</h2>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-warm-white border-b border-pearl-grey">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                <th className="px-5 py-3 font-medium">Ordine</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Stato</th>
                <th className="px-5 py-3 font-medium text-right">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pearl-grey/60">
              {orderList.map((o) => (
                <tr key={o.id} className="hover:bg-ivory/50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/ordini/${o.id}`} className="text-gold-dark hover:text-gold-primary font-medium">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs text-soft-grey">
                    {new Date(o.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-5 py-3 text-xs">{o.status}</td>
                  <td className="px-5 py-3 text-right">{fmt(Number(o.total_amount))}</td>
                </tr>
              ))}
              {orderList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-soft-grey">
                    Nessun ordine
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="space-y-6">
          {/* Anagrafica */}
          <section className="border border-pearl-grey bg-white p-6">
            <h2 className="font-medium text-sm mb-3">Anagrafica</h2>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-soft-grey">Nome</dt>
                <dd>{profile.full_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soft-grey">Email</dt>
                <dd className="truncate">{profile.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soft-grey">Telefono</dt>
                <dd>{profile.phone ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soft-grey">Lingua</dt>
                <dd>{customer?.preferred_language ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-soft-grey">Registrato</dt>
                <dd>{new Date(profile.created_at).toLocaleDateString('it-IT')}</dd>
              </div>
            </dl>
          </section>

          {/* Mailing consents */}
          <section className="border border-pearl-grey bg-white p-6">
            <h2 className="font-medium text-sm mb-3">Consensi mailing</h2>
            <dl className="space-y-2">
              <ConsentRow
                label="Newsletter"
                on={!!customer?.newsletter_consent}
                at={customer?.newsletter_consent_at}
              />
              <ConsentRow
                label="Marketing"
                on={!!customer?.marketing_consent}
                at={customer?.marketing_consent_at}
              />
              <ConsentRow
                label="Iscritto newsletter"
                on={!!(newsletter?.is_subscribed && newsletter?.is_confirmed)}
              />
            </dl>
          </section>

          {/* Addresses */}
          <section className="border border-pearl-grey bg-white p-6">
            <h2 className="font-medium text-sm mb-3">Indirizzi ({addresses?.length ?? 0})</h2>
            <div className="space-y-3">
              {(addresses ?? []).map((a) => (
                <div key={a.id} className="text-xs border border-pearl-grey/60 p-3">
                  <p className="uppercase tracking-[0.15em] text-[9px] text-soft-grey mb-1">
                    {a.type ?? 'indirizzo'} {a.is_default ? '· predefinito' : ''}
                  </p>
                  <p className="font-medium">{a.full_name}</p>
                  <p>{a.street_address}</p>
                  <p>
                    {a.postal_code} {a.city} ({a.country})
                  </p>
                  {a.phone && <p className="text-soft-grey">{a.phone}</p>}
                </div>
              ))}
              {!addresses?.length && <p className="text-xs text-soft-grey">Nessun indirizzo salvato</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
