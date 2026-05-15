import { createServerClient } from './supabase/server';

export type UserRole = 'customer' | 'admin' | 'editor' | 'order_manager' | 'super_admin';

export async function getCurrentUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await getUserProfile();
  if (!profile) throw new Error('Unauthorized');
  if (!allowedRoles.includes(profile.role as UserRole)) {
    throw new Error('Forbidden');
  }
  return profile;
}

export async function requireAdminRole() {
  return requireRole(['admin', 'super_admin']);
}

export async function requireEditorRole() {
  return requireRole(['editor', 'admin', 'super_admin']);
}

export async function requireOrderManagerRole() {
  return requireRole(['order_manager', 'admin', 'super_admin']);
}
