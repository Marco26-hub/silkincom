"use client";

import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { SalesNotification } from "@/components/ui/SalesNotification";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { WelcomePopup } from "@/components/ui/WelcomePopup";
import { MotionConfig } from "framer-motion";
import type { HomeSectionLocalized } from "@/data/home-content";

const EXPERIENCE_CHROME: Record<string, { skip: string; lakes: string }> = {
  it: {
    skip: "Vai al contenuto principale",
    lakes: "Lago di Como & Lago Maggiore",
  },
  en: { skip: "Skip to main content", lakes: "Lake Como & Lake Maggiore" },
  es: {
    skip: "Saltar al contenido principal",
    lakes: "Lago de Como & Lago Maggiore",
  },
  fr: { skip: "Aller au contenu principal", lakes: "Lac de Côme & Lac Majeur" },
  de: { skip: "Zum Hauptinhalt", lakes: "Comer See & Lago Maggiore" },
  pt: {
    skip: "Saltar para o conteúdo principal",
    lakes: "Lago de Como & Lago Maggiore",
  },
  nl: { skip: "Naar de hoofdinhoud", lakes: "Comomeer & Lago Maggiore" },
};

export function PublicChrome({
  children,
  announcementSection,
}: {
  children: React.ReactNode;
  announcementSection?: HomeSectionLocalized | null;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const isAdmin = pathname?.startsWith("/admin");
  const isExperience = pathname === "/experience";

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <MotionConfig reducedMotion="user">
      {isExperience && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-12 focus:z-[100] focus:bg-soft-black focus:px-5 focus:py-3 focus:text-warm-white"
        >
          {EXPERIENCE_CHROME[locale].skip}
        </a>
      )}
      {isExperience ? (
        <div className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-center bg-soft-black px-5 text-center text-[9px] tracking-[0.12em] text-warm-white">
          SILKinCOM Experience · {EXPERIENCE_CHROME[locale].lakes}
        </div>
      ) : (
        <AnnouncementBar section={announcementSection} />
      )}
      <Header />
      <CartDrawer />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      {!isExperience && <FloatingNav />}
      <WhatsAppButton />
      {!isExperience && <WelcomePopup />}
      <CookieBanner />
      {!isExperience && <SalesNotification />}
    </MotionConfig>
  );
}
