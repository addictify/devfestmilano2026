import { setRequestLocale } from "next-intl/server";
import { Dashboard } from "@/components/admin/Dashboard";


export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Dashboard />;
}
