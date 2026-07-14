'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
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
  Mail,
  CreditCard,
  FolderTree,
  Image as ImageIcon,
  ClipboardList,
  ScrollText,
  LogOut,
  Building2,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

const ALL = ['admin', 'super_admin', 'editor', 'order_manager'];
const ADMIN = ['admin', 'super_admin'];
const EDITOR = ['admin', 'super_admin', 'editor'];
const ORDERS = ['admin', 'super_admin', 'order_manager'];

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operatività',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ALL },
      { href: '/admin/ordini', label: 'Ordini', icon: ShoppingBag, roles: ORDERS },
      { href: '/admin/spedizioni', label: 'Spedizioni', icon: Truck, roles: ORDERS },
      { href: '/admin/resi', label: 'Resi', icon: Undo2, roles: ORDERS },
      { href: '/admin/contatti', label: 'Contatti', icon: Mail, roles: ORDERS },
      { href: '/admin/pagamenti', label: 'Pagamenti', icon: CreditCard, roles: ADMIN },
    ],
  },
  {
    label: 'Catalogo',
    items: [
      { href: '/admin/prodotti', label: 'Prodotti', icon: Package, roles: EDITOR },
    ],
  },
  {
    label: 'Magazzino',
    items: [
      { href: '/admin/magazzino', label: 'Magazzino', icon: Boxes, roles: ORDERS },
      { href: '/admin/ordini-fornitori', label: 'Ordini Fornitori', icon: ClipboardList, roles: ORDERS },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/coupon', label: 'Coupon', icon: Tag, roles: ADMIN },
      { href: '/admin/lead-b2b', label: 'Lead B2B', icon: Building2, roles: ADMIN },
      { href: '/admin/recensioni', label: 'Recensioni', icon: Star, roles: EDITOR },
    ],
  },
  {
    label: 'Clienti & Contenuti',
    items: [
      { href: '/admin/clienti', label: 'Clienti', icon: Users, roles: ADMIN },
      { href: '/admin/pagine', label: 'Pagine', icon: FileText, roles: EDITOR },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/etsy', label: 'Etsy', icon: Store, roles: ADMIN },
      { href: '/admin/audit', label: 'Audit Log', icon: ScrollText, roles: ['super_admin'] },
      { href: '/admin/errors', label: 'Errori', icon: AlertCircle, roles: ADMIN },
      { href: '/admin/impostazioni', label: 'Impostazioni', icon: Settings, roles: ADMIN },
    ],
  },
];

const MOBILE_NAV: NavItem[] = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard, roles: ALL },
  { href: '/admin/ordini', label: 'Ordini', icon: ShoppingBag, roles: ORDERS },
  { href: '/admin/prodotti', label: 'Prodotti', icon: Package, roles: EDITOR },
  { href: '/admin/magazzino', label: 'Magazzino', icon: Boxes, roles: ORDERS },
  { href: '/admin/impostazioni', label: 'Altro', icon: Settings, roles: ADMIN },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
}

export function AdminSidebar({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const mobileItems = MOBILE_NAV.filter((i) => i.roles.includes(role));

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-pearl-grey bg-white">
        <Link href="/admin" className="font-display text-2xl px-6 pt-6 pb-5 block">
          SILKinCOM <span className="text-gold-primary text-xs uppercase tracking-[0.3em] block mt-1">Admin</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          {SECTIONS.map((section) => {
            const items = section.items.filter((i) => i.roles.includes(role));
            if (items.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="px-2 mb-1.5 text-[9px] uppercase tracking-[0.25em] text-soft-grey/70">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-soft-black text-warm-white'
                            : 'text-soft-black/70 hover:bg-pearl-grey/40 hover:text-soft-black'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-pearl-grey">
          <p className="text-xs text-soft-grey mb-1 truncate">{userName}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-primary mb-3">{role}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs text-soft-grey hover:text-soft-black transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-pearl-grey flex">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
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
