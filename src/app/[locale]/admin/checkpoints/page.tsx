import { CheckpointsAdmin } from "@/components/admin/CheckpointsAdmin";

export const dynamic = "force-dynamic";

// Deliberately renders no data: checkpoint docs hold the QR `secret` and quiz
// `answer`, and the admin gate above this page is client-side, so server-rendered
// props would reach unauthenticated visitors. CheckpointsAdmin fetches from the
// verifyAdmin-guarded GET /api/admin/checkpoints instead.
export default function AdminCheckpointsPage() {
  return <CheckpointsAdmin />;
}
