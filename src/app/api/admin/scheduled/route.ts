import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin, verifyAdminIdentity } from "@/lib/auth/admin-guard";
import { getSessions } from "@/lib/data/content";
import { siteConfig } from "@/lib/site";
import { parseAnnouncementInput, parseIdList } from "@/lib/push/announcements";
import { parseScheduleTime, scheduleTemplates } from "@/lib/push/schedule";

export const dynamic = "force-dynamic";

const COLLECTION = "scheduledAnnouncements";
const iso = (t: unknown) => (t ? (t as Timestamp).toDate().toISOString() : null);

/** Announcements waiting to go out (and any that failed or were missed),
 *  soonest first, plus presets timed from the agenda. */
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  // Small collection: read it whole and filter here rather than need a
  // composite index for status + sendAt.
  const [snap, sessions] = await Promise.all([db.collection(COLLECTION).get(), getSessions()]);
  const scheduled = snap.docs
    .map((d) => {
      const a = d.data();
      return {
        id: d.id,
        titleIt: a.titleIt ?? "",
        bodyIt: a.bodyIt ?? "",
        titleEn: a.titleEn ?? null,
        bodyEn: a.bodyEn ?? null,
        sendAt: iso(a.sendAt),
        status: a.status as string,
        createdBy: a.createdBy ?? null,
        error: a.error ?? null,
      };
    })
    .filter((a) => a.status !== "sent")
    .sort((a, b) => (a.sendAt ?? "").localeCompare(b.sendAt ?? ""));
  const templates = scheduleTemplates(sessions, {
    eventDate: siteConfig.eventDate,
    venue: siteConfig.venue.name,
  });
  return NextResponse.json({ ok: true, scheduled, templates });
}

function parseBody(body: unknown) {
  const input = parseAnnouncementInput(body);
  const sendAt = parseScheduleTime((body as { sendAt?: unknown } | null)?.sendAt, new Date());
  return input && sendAt ? { input, sendAt } : null;
}

/** Schedule an announcement: copy as for "send now", plus `sendAt` (ISO). */
export async function POST(req: Request) {
  const admin = await verifyAdminIdentity(req);
  if (!admin) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const parsed = parseBody(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const ref = await db.collection(COLLECTION).add({
    ...parsed.input,
    sendAt: Timestamp.fromDate(new Date(parsed.sendAt)),
    status: "pending",
    createdBy: admin.email ?? admin.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, id: ref.id });
}

/** Change copy or time. Re-arms a failed or missed item; refuses one that
 *  is mid-send or already sent. */
export async function PATCH(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const id = parseIdList({ ids: [body?.id] })?.[0];
  const parsed = parseBody(body);
  if (!id || !parsed) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const ref = db.collection(COLLECTION).doc(id);
  const outcome = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return "not-found";
    if (["sending", "sent"].includes(doc.get("status"))) return "locked";
    tx.update(ref, {
      ...parsed.input,
      sendAt: Timestamp.fromDate(new Date(parsed.sendAt)),
      status: "pending",
      error: FieldValue.delete(),
    });
    return "ok";
  });
  if (outcome !== "ok") {
    return NextResponse.json({ ok: false, reason: outcome }, { status: outcome === "locked" ? 409 : 404 });
  }
  return NextResponse.json({ ok: true });
}

/** Cancel one or many: `{ ids: [...] }`. Anything mid-send is left alone. */
export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const ids = parseIdList(await req.json().catch(() => null));
  if (!ids) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  let deleted = 0;
  for (const id of ids) {
    const ref = db.collection(COLLECTION).doc(id);
    const done = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists || doc.get("status") === "sending") return false;
      tx.delete(ref);
      return true;
    });
    if (done) deleted++;
  }
  return NextResponse.json({ ok: true, deleted });
}
