import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { SPONSOR_TIERS } from "@/types/models";

export const dynamic = "force-dynamic";

function revalidateSponsors() {
  for (const l of ["it", "en"]) {
    revalidatePath(`/${l}`);
    revalidatePath(`/${l}/sponsors`);
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.tier !== "string" || !(SPONSOR_TIERS as string[]).includes(body.tier)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("sponsors").doc().id;
  const data = {
    name: body.name,
    tier: body.tier,
    website: typeof body.website === "string" ? body.website : "",
    logoLight: body.logoLight ?? null,
    logoDark: body.logoDark ?? null,
    order: Number.isFinite(body.order) ? Number(body.order) : 999,
    active: body.active !== false,
  };
  await db.collection("sponsors").doc(id).set(data, { merge: true });
  revalidateSponsors();
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("sponsors").doc(id).delete();
  revalidateSponsors();
  return NextResponse.json({ ok: true });
}
