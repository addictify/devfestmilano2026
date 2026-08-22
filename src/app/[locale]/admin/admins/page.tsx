import { AdminsAdmin } from "@/components/admin/AdminsAdmin";

export const dynamic = "force-dynamic";

// Renders no data server-side: the admin list is fetched through the
// verifyAdmin-guarded API, since the gate above this page is client-side.
export default function AdminAdminsPage() {
  return <AdminsAdmin />;
}
