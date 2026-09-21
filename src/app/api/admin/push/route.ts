import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin, verifyAdminIdentity } from "@/lib/auth/admin-guard";
import { announcementPayload } from "@/lib/push/subscription";
import { allSubscriptions, isPushConfigured, sendToSubscriptions } from "@/lib/push/send";

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

  const body = await req.json().catch(() => null);
  const titleIt = typeof body?.titleIt === "string" ? body.titleIt.trim() : "";
  const bodyIt = typeof body?.bodyIt === "string" ? body.bodyIt.trim() : "";
  const titleEn = typeof body?.titleEn === "string" ? body.titleEn.trim() : "";
  const bodyEn = typeof body?.bodyEn === "string" ? body.bodyEn.trim() : "";
  if (!titleIt || !bodyIt) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const subscriptions = await allSubscriptions(db);
  const result = await sendToSubscriptions(db, subscriptions, (subscription) =>
    subscription.locale === "en" && titleEn && bodyEn
      ? announcementPayload(titleEn, bodyEn, "en")
      // No English copy written: send the Italian one rather than nothing.
      // A notification in the wrong language beats a room that wasn't told.
      : announcementPayload(titleIt, bodyIt, "it"),
  );

  await db.collection("announcements").add({
    titleIt,
    bodyIt,
    titleEn: titleEn || null,
    bodyEn: bodyEn || null,
    sentBy: admin.email ?? admin.uid,
    sentAt: FieldValue.serverTimestamp(),
    ...result,
  });

  return NextResponse.json({ ok: true, ...result });
}
