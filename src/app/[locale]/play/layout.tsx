import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/data/settings";

/** Gates every /play page on the `questEnabled` flag, so turning DevFest
 *  Quest off in /admin takes the whole game offline, not just its nav link. */
export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const { questEnabled } = await getSiteSettings();
  if (!questEnabled) notFound();
  return children;
}
