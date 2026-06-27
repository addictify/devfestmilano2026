import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";

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
  await db.collection("feedback").doc(sessionId).collection("responses").doc(uid).set(
    { rating, comment, at: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return NextResponse.json({ ok: true });
}
