'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Boxes,
  Users,
  Tag,
  Undo2,
  FileText,
  Star,
  AlertCircle,
  Settings,
  Store,
  Truck,
  LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'order_manager', 'editor'] },
  { href: '/admin/ordini', label: 'Ordini', icon: ShoppingBag, roles: ['admin', 'super_admin', 'order_manager'] },
  { href: '/admin/prodotti', label: 'Prodotti', icon: Package, roles: ['admin', 'super_admin', 'editor'] },
  { href: '/admin/magazzino', label: 'Magazzino', icon: Boxes, roles: ['admin', 'super_admin', 'order_manager'] },
  { href: '/admin/spedizioni', label: 'Spedizioni', icon: Truck, roles: ['admin', 'super_admin', 'order_manager'] },
  { href: '/admin/recensioni', label: 'Recensioni', icon: Star, roles: ['admin', 'super_admin', 'editor'] },
  { href: '/admin/clienti', label: 'Clienti', icon: Users, roles: ['admin', 'super_admin'] },
  { href: '/admin/coupon', label: 'Coupon', icon: Tag, roles: ['admin', 'super_admin'] },
  { href: '/admin/resi', label: 'Resi', icon: Undo2, roles: ['admin', 'super_admin', 'order_manager'] },
  { href: '/admin/audit', label: 'Audit Log', icon: FileText, roles: ['super_admin'] },
  { href: '/admin/errors', label: 'Errori', icon: AlertCircle, roles: ['admin', 'super_admin'] },
  { href: '/admin/etsy', label: 'Etsy', icon: Store, roles: ['admin', 'super_admin'] },
  { href: '/admin/impostazioni', label: 'Impostazioni', icon: Settings, roles: ['admin', 'super_admin'] },
];

const MOBILE_NAV = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'order_manager', 'editor'] },
  { href: '/admin/ordini', label: 'Ordini', icon: ShoppingBag, roles: ['admin', 'super_admin', 'order_manager'] },
  { href: '/admin/prodotti', label: 'Prodotti', icon: Package, roles: ['admin', 'super_admin', 'editor'] },
  { href: '/admin/magazzino', label: 'Magazzino', icon: Boxes, roles: ['admin', 'super_admin', 'order_manager'] },
  { href: '/admin/impostazioni', label: 'Altro', icon: Settings, roles: ['admin', 'super_admin'] },
];

export function AdminSidebar({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => i.roles.includes(role));
  const mobileItems = MOBILE_NAV.filter((i) => i.roles.includes(role));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-pearl-grey bg-white p-6">
        <Link href="/admin" className="font-display text-2xl mb-8">
          SILKinCOM <span className="text-gold-primary text-xs uppercase tracking-[0.3em] block mt-1">Admin</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-soft-black text-warm-white'
                    : 'text-soft-black/70 hover:bg-pearl-grey/40 hover:text-soft-black'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-pearl-grey">
          <p className="text-xs text-soft-grey mb-1">{userName}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-primary mb-4">{role}</p>
          <Link
            href="/api/auth/logout"
            className="inline-flex items-center gap-2 text-xs text-soft-grey hover:text-soft-black transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-pearl-grey flex">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] uppercase tracking-[0.15em] transition-colors ${
                active ? 'text-soft-black' : 'text-soft-black/40'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-gold-primary' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
