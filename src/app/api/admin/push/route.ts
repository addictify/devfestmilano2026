import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin, verifyAdminIdentity } from "@/lib/auth/admin-guard";
import { parseAnnouncementInput } from "@/lib/push/announcements";
import { sendAnnouncement } from "@/lib/push/announce";
import { allSubscriptions, isPushConfigured } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/** How many devices an announcement would reach, for the admin form. */
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const subscriptions = await allSubscriptions(db);
  return NextResponse.json({
    ok: true,
    configured: isPushConfigured(),
    total: subscriptions.length,
    signedIn: subscriptions.filter((s) => s.uid).length,
  });
}

/**
 * Send an announcement to every subscribed device.
 *
 * There is no recall: once a push is accepted by the push service it is on its
 * way to a lock screen. The admin form asks for confirmation before calling
 * this, and every send is written to `announcements` so there is a record of
 * what was said to the room and by whom.
 */
export async function POST(req: Request) {
  const admin = await verifyAdminIdentity(req);
  if (!admin) return NextResponse.json({ ok: false }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, reason: "no-vapid" }, { status: 503 });
  }

  const input = parseAnnouncementInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const result = await sendAnnouncement(db, input, admin.email ?? admin.uid);

  return NextResponse.json({ ok: true, ...result });
}
