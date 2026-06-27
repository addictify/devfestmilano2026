import { getBadges, getCheckpoints } from "@/lib/data/game";
import { CheckpointsAdmin } from "@/components/admin/CheckpointsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCheckpointsPage() {
  const [checkpoints, badges] = await Promise.all([getCheckpoints(), getBadges()]);
  return <CheckpointsAdmin initial={checkpoints} badges={badges} />;
}
