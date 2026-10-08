import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isCronRequest } from "@/lib/auth/cron-guard";
import { parseAnnouncementInput } from "@/lib/push/announcements";
import { sendAnnouncement } from "@/lib/push/announce";
import { isPushConfigured } from "@/lib/push/send";
import { dueScheduled } from "@/lib/push/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLLECTION = "scheduledAnnouncements";

/**
 * Send the scheduled announcements whose time has come. Cloud Scheduler
 * (`scheduled-announcements`) calls this every five minutes around the event,
 * so a send lands within five minutes of the time picked in the admin.
 *
 * Each item is claimed in a transaction (pending → sending) before anything
 * goes out: two overlapping runs, or a scheduler retry, can't send it twice.
 */
async function handler(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, reason: "no-vapid" }, { status: 503 });
  }

  const snap = await db.collection(COLLECTION).where("status", "==", "pending").get();
  const items = snap.docs.map((d) => ({
    id: d.id,
    status: d.get("status") as string,
    sendAt: d.get("sendAt")?.toDate().toISOString() ?? null,
  }));
  const { due, missed } = dueScheduled(items, new Date());

  for (const m of missed) {
    await db.collection(COLLECTION).doc(m.id).update({ status: "missed" });
  }

  const results: { id: string; status: string }[] = [];
  for (const item of due) {
    const ref = db.collection(COLLECTION).doc(item.id);
    const claimed = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists || doc.get("status") !== "pending") return null;
      tx.update(ref, { status: "sending", claimedAt: FieldValue.serverTimestamp() });
      return doc.data()!;
    });
    if (!claimed) continue;

    const input = parseAnnouncementInput(claimed);
    if (!input) {
      await ref.update({ status: "failed", error: "invalid-copy" });
      results.push({ id: item.id, status: "failed" });
      continue;
    }
    try {
      const sent = await sendAnnouncement(db, input, `programmata · ${claimed.createdBy ?? "admin"}`);
      await ref.update({
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        announcementId: sent.id,
        sent: sent.sent,
        failed: sent.failed,
      });
      results.push({ id: item.id, status: "sent" });
    } catch (error) {
      await ref.update({ status: "failed", error: String(error).slice(0, 300) });
      results.push({ id: item.id, status: "failed" });
    }
  }

  return NextResponse.json({ ok: true, due: due.length, missed: missed.length, results });
}

export const GET = handler;
export const POST = handler;
