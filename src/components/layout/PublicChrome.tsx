'use client';

import { usePathname } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { SalesNotification } from '@/components/ui/SalesNotification';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FloatingNav } from '@/components/ui/FloatingNav';
import type { HomeSectionLocalized } from '@/data/home-content';

export function PublicChrome({
  children,
  announcementSection,
  recessoEnabled = true,
}: {
  children: React.ReactNode;
  announcementSection?: HomeSectionLocalized | null;
  recessoEnabled?: boolean;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <AnnouncementBar section={announcementSection} />
      <Header />
      <CartDrawer />
      <main>{children}</main>
      <Footer recessoEnabled={recessoEnabled} />
      <FloatingNav />
      <CookieBanner />
      <SalesNotification />
    </>
  );
}
