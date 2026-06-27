import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });

  const optIn = body.leaderboardOptIn === true;
  const displayName = typeof body.displayName === "string"
    ? body.displayName.replace(/[\p{Cc}\s]/gu, "").slice(0, 40)
    : "";
  if (optIn && !displayName) return NextResponse.json({ ok: false, reason: "name-required" }, { status: 400 });

  await db.collection("users").doc(uid).set({ displayName, leaderboardOptIn: optIn }, { merge: true });

  const lbRef = db.collection("leaderboard").doc(uid);
  if (optIn) {
    const prof = await db.collection("gameProfiles").doc(uid).get();
    await lbRef.set({ displayName, points: prof.data()?.points ?? 0 });
  } else {
    await lbRef.delete().catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
