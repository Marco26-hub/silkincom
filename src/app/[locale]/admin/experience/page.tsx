import { redirect } from "@/i18n/navigation";
import { requireAdminApi } from "@/lib/admin-api";
import { ExperienceManager } from "@/components/admin/ExperienceManager";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gestione Experience — Admin",
  robots: { index: false, follow: false },
};
export default async function AdminExperiencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const auth = await requireAdminApi();
  if (!auth.ok)
    return redirect({
      href:
        auth.status === 401 ? "/login?redirect=/admin/experience" : "/admin",
      locale,
    });
  return <ExperienceManager />;
}
