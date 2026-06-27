import { getSiteSettings } from "@/lib/data/settings";
import { ConfigAdmin } from "@/components/admin/ConfigAdmin";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const settings = await getSiteSettings();
  return <ConfigAdmin initial={settings} />;
}
