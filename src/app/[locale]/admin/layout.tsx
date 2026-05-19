import { redirect } from '@/i18n/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { AdminSearch } from '@/components/admin/AdminSearch';

export const metadata = { title: 'Admin — SILKinCOM', robots: { index: false } };

const ADMIN_ROLES = ['admin', 'super_admin', 'editor', 'order_manager'] as const;

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // `return` makes the early exit explicit for type narrowing; the
    // next-intl `redirect` itself throws at runtime.
    return redirect({ href: '/login?redirect=/admin', locale });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    return redirect({ href: '/', locale });
  }

  return (
    <div className="min-h-screen bg-warm-white text-soft-black flex">
      <AdminSidebar role={profile.role} userName={profile.full_name ?? profile.email} />
      <div className="flex-1 lg:ml-64 flex flex-col">
        <div className="flex justify-between items-center px-6 lg:px-10 py-3 border-b border-pearl-grey/40 bg-white lg:bg-transparent gap-4">
          <AdminSearch />
          <AdminNotificationBell />
        </div>
        <main className="flex-1 px-6 py-6 lg:px-10 pb-20 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
