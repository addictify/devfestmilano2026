import { setRequestLocale } from "next-intl/server";
import { SubscribersAdmin } from "@/components/admin/SubscribersAdmin";


export default async function AdminSubscribersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SubscribersAdmin />;
}
