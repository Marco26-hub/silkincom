import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export type AdminAuth =
  | { ok: true; userId: string; role: string }
  | { ok: false; status: number };

/**
 * Shared admin auth guard for API routes.
 * Returns { ok, userId, role } on success, { ok: false, status } otherwise.
 */
export async function requireAdminApi(
  roles: string[] = ['admin', 'super_admin'],
): Promise<AdminAuth> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !roles.includes(profile.role)) return { ok: false, status: 403 };
  return { ok: true, userId: user.id, role: profile.role };
}

/** Standard JSON error response for failed admin auth. */
export function forbidden(status: number) {
  return NextResponse.json(
    { error: status === 401 ? 'Non autenticato' : 'Accesso negato' },
    { status },
  );
}
