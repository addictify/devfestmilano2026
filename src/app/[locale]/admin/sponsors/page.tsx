import { setRequestLocale } from "next-intl/server";
import { SponsorsAdmin } from "@/components/admin/SponsorsAdmin";

// No server-side data: the admin panel ships in the static export, so anything
// read during the render would be frozen at build time. SponsorsAdmin loads through
// the verifyAdmin-guarded API instead.
export default async function AdminSponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SponsorsAdmin />;
}
