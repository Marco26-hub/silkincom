import type { Metadata } from "next";
import { getExperienceLocale } from "@/data/experience-localized";
import { AccountShell } from "@/components/account/AccountShell";
import { MyTrips } from "@/components/account/MyTrips";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getExperienceLocale(locale);
  return {
    title: t("Esperienze salvate"),
    robots: { index: false, follow: false },
  };
}
export default async function TripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { copy, content } = await getExperienceLocale(locale);
  return (
    <AccountShell title={copy["Esperienze salvate"]}>
      <MyTrips locale={locale} copy={copy} content={content} />
    </AccountShell>
  );
}
