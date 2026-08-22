import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { getTeam } from "@/lib/data/content";

export const dynamic = "force-dynamic";

function revalidateTeam() {
  for (const l of ["it", "en"]) revalidatePath(`/${l}/team`);
}

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  return NextResponse.json({ ok: true, team: await getTeam() });
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("team").doc().id;
  const data = {
    name: body.name,
    role: { it: body.roleIt ?? "", en: body.roleEn ?? "" },
    photo: body.photo ?? null,
    links: Array.isArray(body.links) ? body.links : [],
    order: Number.isFinite(body.order) ? Number(body.order) : 999,
  };
  await db.collection("team").doc(id).set(data, { merge: true });
  revalidateTeam();
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("team").doc(id).delete();
  revalidateTeam();
  return NextResponse.json({ ok: true });
}
