import { getAllSponsors } from "@/lib/data/content";
import { SponsorsAdmin } from "@/components/admin/SponsorsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage() {
  const sponsors = await getAllSponsors();
  return <SponsorsAdmin initial={sponsors} />;
}
