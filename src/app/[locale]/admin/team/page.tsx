import { getTeam } from "@/lib/data/content";
import { TeamAdmin } from "@/components/admin/TeamAdmin";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const team = await getTeam();
  return <TeamAdmin initial={team} />;
}
