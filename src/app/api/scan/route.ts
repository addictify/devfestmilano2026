import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";
import { awardForScan, quizOutcome, validateScan, type GameProfile, type MilestoneBadge } from "@/lib/gamification";
import type { LocalizedString } from "@/types/models";

export const dynamic = "force-dynamic";

type CheckpointDoc = {
  active: boolean; secret: string; points: number; badgeId?: string;
  question?: LocalizedString; answer?: string; quizMode?: "add" | "multiply"; quizValue?: number; wrongPenalty?: number;
};

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const checkpointId = body?.checkpointId;
  const token = body?.token;
  if (typeof checkpointId !== "string" || typeof token !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const answerProvided = typeof body?.answer === "string";
  const answer: string | undefined = answerProvided ? body.answer : undefined;

  const scanRef = db.collection("gameProfiles").doc(uid).collection("scans").doc(checkpointId);
  const profileRef = db.collection("gameProfiles").doc(uid);

  const cpSnap = await db.collection("checkpoints").doc(checkpointId).get();
  const cp = cpSnap.exists ? (cpSnap.data() as CheckpointDoc) : null;
  const verdict = validateScan(cp, token);
  if (verdict !== "ok") {
    const status = verdict === "not-found" ? 404 : 403;
    return NextResponse.json({ ok: false, reason: verdict }, { status });
  }

  const hasQuiz = Boolean(cp!.answer);

  // PEEK phase: quiz checkpoint, no answer submitted yet → return the question (never the answer).
  if (hasQuiz && !answerProvided) {
    const existing = await scanRef.get();
    if (existing.exists) return NextResponse.json({ ok: true, already: true });
    return NextResponse.json({ ok: true, quiz: { question: cp!.question ?? null } });
  }

  // Milestone badges = badges carrying a positive `milestone`.
  const badgeSnap = await db.collection("badges").where("milestone", ">", 0).get();
  const milestones: MilestoneBadge[] = badgeSnap.docs.map((d) => ({ id: d.id, milestone: d.data().milestone as number }));

  // AWARD phase (no quiz, or answer submitted) — idempotent transaction.
  const result = await db.runTransaction(async (tx) => {
    const scanDoc = await tx.get(scanRef);
    if (scanDoc.exists) return { already: true as const };
    const profDoc = await tx.get(profileRef);
    const current: GameProfile = profDoc.exists
      ? { points: profDoc.data()!.points ?? 0, badgeIds: profDoc.data()!.badgeIds ?? [], scanCount: profDoc.data()!.scanCount ?? 0 }
      : { points: 0, badgeIds: [], scanCount: 0 };
    const { correct, pointsDelta } = quizOutcome(
      { points: cp!.points, answer: cp!.answer, quizMode: cp!.quizMode, quizValue: cp!.quizValue, wrongPenalty: cp!.wrongPenalty },
      answer,
    );
    const next = awardForScan(current, pointsDelta, cp!.badgeId, milestones);
    tx.set(scanRef, { at: FieldValue.serverTimestamp(), points: pointsDelta, correct });
    tx.set(profileRef, next, { merge: true });
    const newBadgeIds = next.badgeIds.filter((b) => !current.badgeIds.includes(b));
    return { already: false as const, awarded: { pointsDelta, correct, newBadgeIds, total: next.points } };
  });

  if (result.already) return NextResponse.json({ ok: true, already: true });

  // Best-effort leaderboard sync if the user opted in (never fail the scan over it).
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const u = userDoc.data();
    if (u?.leaderboardOptIn && u?.displayName) {
      await db.collection("leaderboard").doc(uid).set({ displayName: u.displayName, points: result.awarded!.total });
    }
  } catch {
    // non-critical
  }

  return NextResponse.json({ ok: true, awarded: result.awarded });
}
