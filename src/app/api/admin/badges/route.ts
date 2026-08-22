import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { getBadges } from "@/lib/data/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  return NextResponse.json({ ok: true, badges: await getBadges() });
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nameIt !== "string" || !body.nameIt) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("badges").doc().id;
  const ms = Number(body.milestone);
  const data = {
    name: { it: body.nameIt, en: body.nameEn || body.nameIt },
    description: { it: body.descIt || "", en: body.descEn || body.descIt || "" },
    icon: typeof body.icon === "string" ? body.icon : "🏅",
    ...(Number.isFinite(ms) && ms > 0 ? { milestone: ms } : {}),
  };
  await db.collection("badges").doc(id).set(data, { merge: true });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("badges").doc(id).delete();
  return NextResponse.json({ ok: true });
}
