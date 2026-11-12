import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LakeExperience } from "@/components/experience/LakeExperience";
import { getExperienceLocale } from "@/data/experience-localized";
import { routing } from "@/i18n/routing";

const ORIGIN = "https://www.silkincom.com";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const pageUrl = (locale: string) =>
  `${ORIGIN}${locale === "it" ? "" : `/${locale}`}/experience`;
const ogLocales: Record<string, string> = {
  it: "it_IT",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  pt: "pt_PT",
  nl: "nl_NL",
};
const languages = Object.fromEntries([
  ...routing.locales.map((locale) => [locale, pageUrl(locale)]),
  ["x-default", pageUrl("it")],
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) return {};
  const { t } = await getExperienceLocale(locale);
  const title = t("Experience Lago di Como e Lago Maggiore");
  const description = t(
    "Esperienze sul Lago di Como e sul Lago Maggiore: barca privata, golf, ville e Como Silk Experience. Richieda un percorso con accompagnamento e pick-up da aeroporto o stazione.",
  );
  return {
    metadataBase: new URL(ORIGIN),
    category: "travel",
    title,
    description,
    alternates: { canonical: pageUrl(locale), languages },
    keywords: [
      t("esperienze Lago di Como"),
      t("esperienze Lago Maggiore"),
      "Como Silk Experience",
      t("barca privata"),
      "golf",
      "Gin & Wine Experience",
    ],
    robots: {
      index: IS_PRODUCTION,
      follow: IS_PRODUCTION,
      googleBot: { index: IS_PRODUCTION, follow: IS_PRODUCTION },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: pageUrl(locale),
      locale: ogLocales[locale],
      alternateLocale: Object.values(ogLocales).filter(
        (value) => value !== ogLocales[locale],
      ),
      images: [
        {
          url: "/experience/lago-di-como.webp",
          alt: t("Varenna vista dal Lago di Como"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/experience/lago-di-como.webp"],
    },
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    console.info("[experience] Unsupported locale rejected:", locale);
    notFound();
  }
  const { content, copy, t } = await getExperienceLocale(locale);
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl(locale)}#webpage`,
    url: pageUrl(locale),
    name: t("SILKinCOM Experience — Lago di Como e Lago Maggiore"),
    description: t(
      "Progetto di esperienze su misura sui due laghi. Attività, operatori e condizioni da confermare dopo la richiesta.",
    ),
    inLanguage: locale,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "SILKinCOM",
          item: `${ORIGIN}${locale === "it" ? "/" : `/${locale}`}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Experience",
          item: pageUrl(locale),
        },
      ],
    },
    isPartOf: {
      "@id": `${ORIGIN}${locale === "it" ? "" : `/${locale}`}/#website`,
    },
    publisher: { "@id": `${ORIGIN}/#organization` },
    about: [
      { "@type": "Place", name: t("Lago di Como") },
      { "@type": "Place", name: t("Lago Maggiore") },
    ],
    mainEntity: {
      "@type": "ItemList",
      name: t("Idee di esperienze da personalizzare"),
      numberOfItems: content.EXPERIENCES.length,
      itemListElement: content.EXPERIENCES.map((experience, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Thing",
          name: experience.title,
          description: experience.description,
        },
      })),
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <LakeExperience
        preview={process.env.NODE_ENV === "development"}
        locale={locale}
        content={content}
        copy={copy}
      />
    </>
  );
}
