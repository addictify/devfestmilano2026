import { setRequestLocale } from "next-intl/server";
import { CheckpointsAdmin } from "@/components/admin/CheckpointsAdmin";


// Deliberately renders no data: checkpoint docs hold the QR `secret` and quiz
// `answer`, and the admin gate above this page is client-side, so server-rendered
// props would reach unauthenticated visitors. CheckpointsAdmin fetches from the
// verifyAdmin-guarded GET /api/admin/checkpoints instead.
export default async function AdminCheckpointsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CheckpointsAdmin />;
}
