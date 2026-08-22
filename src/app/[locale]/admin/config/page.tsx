import { setRequestLocale } from "next-intl/server";
import { ConfigAdmin } from "@/components/admin/ConfigAdmin";

// No server-side data: the admin panel ships in the static export, so anything
// read during the render would be frozen at build time. ConfigAdmin loads through
// the verifyAdmin-guarded API instead.
export default async function AdminConfigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ConfigAdmin />;
}
