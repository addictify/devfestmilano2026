import { getBadges } from "@/lib/data/game";
import { BadgesAdmin } from "@/components/admin/BadgesAdmin";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const badges = await getBadges();
  return <BadgesAdmin initial={badges} />;
}
