/**
 * Centralised writer for the `error_logs` table from the financial /
 * advertising sync routines.
 *
 * Every silent .catch() in a sync routine ought to flow through here so
 * that /admin/errors and any future observability surface can see why a
 * downstream provider failed — instead of having the error vanish into a
 * console.log on the serverless function.
 *
 * Best-effort: if the insert itself errors (e.g. table missing in tests),
 * we swallow the failure so callers never have to wrap us in try/catch.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type ErrorContext = Record<string, unknown>;

export async function logSyncError(
  supabase: SupabaseClient,
  args: {
    source: string;
    operation: string;
    message: string;
    context?: ErrorContext;
  },
): Promise<void> {
  try {
    await supabase.from('error_logs').insert({
      level: 'error',
      source: `sync.${args.source}`,
      message: `${args.operation}: ${args.message}`.slice(0, 1000),
      context: { source: args.source, operation: args.operation, ...(args.context ?? {}) },
    });
  } catch {
    // intentional: never let logging itself break the caller
  }
}
