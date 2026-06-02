import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowLeft, ExternalLink, Store, Pencil } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type EtsyListing = {
  listing_id: number;
  title: string | null;
  state: string | null;
  url: string | null;
  price: number | null;
  currency: string | null;
  quantity: number | null;
  views: number | null;
  num_favorers: number | null;
  image_urls: string[] | null;
};

function fmtPrice(v: number | null, cur: string | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur || 'EUR' }).format(v);
}

function statePill(s: string | null) {
  const t = (s || '').toLowerCase();
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-amber-100 text-amber-700',
    draft: 'bg-pearl-grey/40 text-soft-grey',
    sold_out: 'bg-red-100 text-red-700',
    expired: 'bg-soft-grey/15 text-soft-grey',
  };
  return map[t] ?? 'bg-pearl-grey/40 text-soft-grey';
}

export default async function AdminEtsyCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const isWrite = mode === 'write';

  const supabase = createServiceClient();
  const { data: listings } = await supabase
    .from('etsy_listings')
    .select('listing_id, title, state, url, price, currency, quantity, views, num_favorers, image_urls')
    .order('views', { ascending: false })
    .limit(500);

  const rows = (listings ?? []) as EtsyListing[];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Link
        href={isWrite ? '/admin/etsy?mode=write' : '/admin/etsy'}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Etsy
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-[#F1641E]" />
          <div>
            <h1 className="font-display text-4xl">Catalogo Etsy</h1>
            <p className="text-soft-grey text-sm">
              {rows.length} inserzioni ·{' '}
              {isWrite
                ? <span className="text-amber-700 font-medium">modalità scrittura</span>
                : 'sola lettura, separato dal catalogo sito'
              }
            </p>
          </div>
        </div>
        <Link
          href={isWrite ? '/admin/etsy/catalogo' : '/admin/etsy/catalogo?mode=write'}
          className={`inline-flex items-center gap-2 px-5 py-2 text-[10px] uppercase tracking-[0.2em] border transition-colors ${
            isWrite
              ? 'border-soft-black bg-soft-black text-warm-white hover:bg-gold-primary hover:text-soft-black hover:border-gold-primary'
              : 'border-pearl-grey text-soft-grey hover:border-soft-black hover:text-soft-black'
          }`}
        >
          {isWrite ? <><Pencil className="w-3 h-3" /> Scrittura ON</> : <><Pencil className="w-3 h-3" /> Attiva scrittura</>}
        </Link>
      </div>

      {isWrite && (
        <div className="border border-amber-200 bg-amber-50/40 px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          Modalità scrittura attiva — clicca <strong>Modifica</strong> su qualsiasi inserzione per aggiornare i campi su Etsy (EN + IT).
        </div>
      )}

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-pearl-grey bg-warm-white/60">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-2 font-medium">Inserzione</th>
              <th className="px-5 py-2 font-medium">Stato</th>
              <th className="px-5 py-2 font-medium text-right">Prezzo</th>
              <th className="px-5 py-2 font-medium text-right">Qtà</th>
              <th className="px-5 py-2 font-medium text-right">Viste</th>
              <th className="px-5 py-2 font-medium text-right">Preferiti</th>
              <th className="px-5 py-2 font-medium">Link</th>
              {isWrite && <th className="px-5 py-2 font-medium">Modifica</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {rows.map((l) => (
              <tr key={l.listing_id} className="hover:bg-ivory/40">
                <td className="px-5 py-2">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 bg-pearl-grey/20 border border-pearl-grey shrink-0">
                      {l.image_urls?.[0] && (
                        <Image src={l.image_urls[0]} alt="" fill sizes="40px" className="object-cover" unoptimized />
                      )}
                    </div>
                    <span className="max-w-[380px] truncate">{l.title || `#${l.listing_id}`}</span>
                  </div>
                </td>
                <td className="px-5 py-2">
                  <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${statePill(l.state)}`}>
                    {l.state || '—'}
                  </span>
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtPrice(l.price, l.currency)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{l.quantity ?? 0}</td>
                <td className="px-5 py-2 text-right tabular-nums">{l.views ?? 0}</td>
                <td className="px-5 py-2 text-right tabular-nums">{l.num_favorers ?? 0}</td>
                <td className="px-5 py-2">
                  {l.url ? (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-soft-grey hover:text-gold-primary">
                      Etsy <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : '—'}
                </td>
                {isWrite && (
                  <td className="px-5 py-2">
                    <Link
                      href={`/admin/etsy/catalogo/${l.listing_id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 border border-pearl-grey text-[10px] uppercase tracking-[0.15em] text-soft-grey hover:border-soft-black hover:text-soft-black transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Modifica
                    </Link>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isWrite ? 8 : 7} className="px-5 py-10 text-center text-soft-grey text-sm">
                  Nessuna inserzione. Vai su Etsy → «Scarica da Etsy» per popolare il mirror.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
