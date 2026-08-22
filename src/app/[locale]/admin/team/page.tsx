import { setRequestLocale } from "next-intl/server";
import { TeamAdmin } from "@/components/admin/TeamAdmin";

// No server-side data: the admin panel ships in the static export, so anything
// read during the render would be frozen at build time. TeamAdmin loads through
// the verifyAdmin-guarded API instead.
export default async function AdminTeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TeamAdmin />;
}
