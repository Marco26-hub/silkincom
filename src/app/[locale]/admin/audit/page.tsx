import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const supabase = createServiceClient();
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, changes, created_at, profiles(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Audit Log</h1>
        <p className="text-soft-grey text-sm">{logs?.length ?? 0} eventi recenti</p>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Quando</th>
              <th className="px-5 py-3 font-medium">Admin</th>
              <th className="px-5 py-3 font-medium">Azione</th>
              <th className="px-5 py-3 font-medium">Entità</th>
              <th className="px-5 py-3 font-medium">Modifiche</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(logs ?? []).map((l: any) => (
              <tr key={l.id}>
                <td className="px-5 py-3 text-xs text-soft-grey">{new Date(l.created_at).toLocaleString('it-IT')}</td>
                <td className="px-5 py-3 text-xs">{l.profiles?.full_name ?? l.profiles?.email ?? '—'}</td>
                <td className="px-5 py-3 text-xs"><code>{l.action}</code></td>
                <td className="px-5 py-3 text-xs">{l.entity_type}: {l.entity_id?.slice(0, 8)}</td>
                <td className="px-5 py-3 text-xs font-mono max-w-md truncate">{JSON.stringify(l.changes)}</td>
              </tr>
            ))}
            {!logs?.length && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-soft-grey">Nessun evento registrato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
