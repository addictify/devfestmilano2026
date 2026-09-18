import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";
import { nextAggregate, type RatingAggregate } from "@/lib/feedback-aggregate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  if (typeof sessionId !== "string" || !sessionId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const sessionRef = db.collection("feedback").doc(sessionId);
  const responseRef = sessionRef.collection("responses").doc(uid);

  // The response doc is keyed by uid, so a second submission replaces the first
  // — one vote per person, by construction. The public counters on the parent
  // have to be adjusted, not incremented, or revising a vote would add a voter.
  // A transaction because two people rating the same talk at the same moment is
  // exactly what happens when a session ends.
  const aggregate = await db.runTransaction(async (tx) => {
    const [previous, stored] = await Promise.all([
      tx.get(responseRef),
      tx.get(sessionRef),
    ]);
    const previousRating = previous.exists ? Number(previous.data()?.rating) : null;
    const next = nextAggregate(
      stored.exists ? (stored.data() as Partial<RatingAggregate>) : null,
      Number.isInteger(previousRating) ? previousRating : null,
      rating,
    );

    tx.set(
      responseRef,
      { rating, comment, at: FieldValue.serverTimestamp() },
      { merge: true },
    );
    // Counters only — this document is world-readable, so no comment and no
    // identity may ever be written here.
    tx.set(
      sessionRef,
      { ...next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return next;
  });

  return NextResponse.json({ ok: true, ...aggregate });
}
