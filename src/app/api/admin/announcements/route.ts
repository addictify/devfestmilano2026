import { NextResponse } from "next/server";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin, verifyAdminIdentity } from "@/lib/auth/admin-guard";
import { parseAnnouncementInput, parseIdList } from "@/lib/push/announcements";

export const dynamic = "force-dynamic";

const COLLECTION = "announcements";
const iso = (t: unknown) => (t ? (t as Timestamp).toDate().toISOString() : null);

/** Sent announcements with their delivery record, newest first. */
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const snap = await db.collection(COLLECTION).orderBy("sentAt", "desc").limit(100).get();
  const announcements = snap.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      titleIt: a.titleIt ?? "",
      bodyIt: a.bodyIt ?? "",
      titleEn: a.titleEn ?? null,
      bodyEn: a.bodyEn ?? null,
      sentAt: iso(a.sentAt),
      sentBy: a.sentBy ?? null,
      sent: a.sent ?? null,
      failed: a.failed ?? null,
      editedAt: iso(a.editedAt),
    };
  });
  return NextResponse.json({ ok: true, announcements });
}

/**
 * Correct an announcement's text. Only the copy on the site changes — the
 * notifications page and the bell. A push already delivered stays on the
 * lock screen as it was; the admin form says so.
 */
export async function PATCH(req: Request) {
  const admin = await verifyAdminIdentity(req);
  if (!admin) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const id = parseIdList({ ids: [body?.id] })?.[0];
  const input = parseAnnouncementInput(body);
  if (!id || !input) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  try {
    await db.collection(COLLECTION).doc(id).update({
      ...input,
      editedAt: FieldValue.serverTimestamp(),
      editedBy: admin.email ?? admin.uid,
    });
  } catch {
    // update() refuses a missing document rather than creating it.
    return NextResponse.json({ ok: false, reason: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** Delete one or many: `{ ids: [...] }`. */
export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const ids = parseIdList(await req.json().catch(() => null));
  if (!ids) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const batch = db.batch();
  for (const id of ids) batch.delete(db.collection(COLLECTION).doc(id));
  await batch.commit();
  return NextResponse.json({ ok: true, deleted: ids.length });
}
