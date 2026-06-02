/**
 * Admin: Error logs viewer.
 * Shows last 100 errors from public.error_logs.
 */
import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Errori — Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

type LogRow = {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
};

const LEVEL_STYLES: Record<string, string> = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default async function AdminErrorsPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('error_logs')
    .select('id, level, message, stack, url, user_agent, context, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const logs = (data || []) as LogRow[];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display font-light text-3xl mb-2">Error Log</h1>
        <p className="text-sm text-soft-black/60">
          {logs.length === 0 ? 'Nessun errore registrato.' : `Ultimi ${logs.length} eventi (max 100).`}
        </p>
      </header>

      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <details key={log.id} className="border border-pearl-grey/60 bg-warm-white">
              <summary className="px-5 py-3 cursor-pointer flex items-center gap-4 hover:bg-ivory">
                <span
                  className={`inline-block text-[9px] uppercase tracking-[0.25em] px-2 py-1 border ${
                    LEVEL_STYLES[log.level] || LEVEL_STYLES.error
                  }`}
                >
                  {log.level}
                </span>
                <span className="flex-1 font-mono text-xs truncate">
                  {log.message}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-soft-black/50">
                  {new Date(log.created_at).toLocaleString('it-IT')}
                </span>
              </summary>
              <div className="px-5 py-4 border-t border-pearl-grey/40 space-y-3 text-xs">
                {log.url && (
                  <p>
                    <strong>URL:</strong>{' '}
                    <a href={log.url} target="_blank" rel="noopener noreferrer" className="text-gold-dark underline break-all">
                      {log.url}
                    </a>
                  </p>
                )}
                {log.user_agent && (
                  <p className="text-soft-black/60">
                    <strong>UA:</strong> {log.user_agent}
                  </p>
                )}
                {log.context && Object.keys(log.context).length > 0 && (
                  <div>
                    <strong>Context:</strong>
                    <pre className="mt-1 bg-ivory p-3 overflow-x-auto text-[10px] leading-relaxed font-mono whitespace-pre-wrap">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  </div>
                )}
                {log.stack && (
                  <pre className="bg-ivory p-3 overflow-x-auto text-[10px] leading-relaxed font-mono whitespace-pre-wrap">
                    {log.stack}
                  </pre>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
