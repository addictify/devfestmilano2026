import { setRequestLocale } from "next-intl/server";
import { BadgesAdmin } from "@/components/admin/BadgesAdmin";

// No server-side data: the admin panel ships in the static export, so anything
// read during the render would be frozen at build time. BadgesAdmin loads through
// the verifyAdmin-guarded API instead.
export default async function AdminBadgesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BadgesAdmin />;
}
