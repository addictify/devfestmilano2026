import { setRequestLocale } from "next-intl/server";
import { PushAdmin } from "@/components/admin/PushAdmin";

export default async function AdminPushPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PushAdmin />;
}
