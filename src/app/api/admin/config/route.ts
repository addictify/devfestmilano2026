import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

const FLAGS = [
  "ticketsAvailable",
  "speakersPublished",
  "schedulePublished",
  "cfpOpen",
] as const;

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const update: Record<string, boolean> = {};
  for (const f of FLAGS) if (typeof body[f] === "boolean") update[f] = body[f];
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: false, reason: "no-flags" }, { status: 400 });
  await db.collection("config").doc("site").set(update, { merge: true });
  // Affected public routes across both locales. The `[locale]` layout reads
  // getSiteSettings() to populate SiteSettingsProvider (ticketsAvailable →
  // Hero/TicketButton), so revalidate the layout segment explicitly — not just
  // the pages — to guarantee the toggle propagates on the next request.
  for (const l of ["it", "en"]) {
    revalidatePath(`/${l}`, "layout");
    revalidatePath(`/${l}/speakers`);
    revalidatePath(`/${l}/agenda`);
    revalidatePath(`/${l}/cfp`);
  }
  return NextResponse.json({ ok: true });
}
