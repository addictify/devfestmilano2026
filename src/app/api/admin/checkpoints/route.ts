import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { getBadges, getCheckpoints } from "@/lib/data/game";

export const dynamic = "force-dynamic";

// Checkpoints carry the QR `secret` and the quiz `answer`, so they must never be
// rendered by the page itself: the admin layout's gate is a client component, and
// anything a server component renders inside it ships to every visitor in the RSC
// payload, signed in or not. The admin UI fetches through here instead.
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const [checkpoints, badges] = await Promise.all([getCheckpoints(), getBadges()]);
  return NextResponse.json({ ok: true, checkpoints, badges });
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nameIt !== "string" || !body.nameIt) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("checkpoints").doc().id;
  const points = Number(body.points);
  const ref = db.collection("checkpoints").doc(id);
  // Generate a secret only on first create; preserve it on edit.
  const existing = await ref.get();
  const secret = existing.exists ? (existing.data()!.secret as string) : randomBytes(8).toString("hex");
  // Optional quiz: only stored when mode is add/multiply AND a question + answer exist.
  const mode = body.quizMode === "add" || body.quizMode === "multiply" ? body.quizMode : null;
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const questionIt = typeof body.questionIt === "string" ? body.questionIt.trim() : "";
  const hasQuiz = Boolean(mode && answer && questionIt);
  const quizValue = Number(body.quizValue);
  const wrongPenalty = Number(body.wrongPenalty);
  const data: Record<string, unknown> = {
    name: { it: body.nameIt, en: body.nameEn || body.nameIt },
    points: Number.isFinite(points) && points > 0 ? Math.floor(points) : 10,
    badgeId: typeof body.badgeId === "string" && body.badgeId ? body.badgeId : null,
    active: body.active !== false,
    secret,
    // Quiz fields: written when present, else explicitly nulled so editing can clear them.
    question: hasQuiz ? { it: questionIt, en: (body.questionEn || questionIt) } : null,
    answer: hasQuiz ? answer : null,
    quizMode: hasQuiz ? mode : null,
    quizValue: hasQuiz && Number.isFinite(quizValue) ? quizValue : null,
    wrongPenalty: hasQuiz && Number.isFinite(wrongPenalty) ? Math.max(0, wrongPenalty) : null,
  };
  await ref.set(data, { merge: true });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("checkpoints").doc(id).delete();
  return NextResponse.json({ ok: true });
}
