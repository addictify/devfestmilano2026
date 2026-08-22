import { setRequestLocale } from "next-intl/server";
import { AdminsAdmin } from "@/components/admin/AdminsAdmin";


// Renders no data server-side: the admin list is fetched through the
// verifyAdmin-guarded API, since the gate above this page is client-side.
export default async function AdminAdminsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminsAdmin />;
}
