import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: { email?: unknown; locale?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Honeypot: bots fill hidden `website`. Pretend success, store nothing.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    // Seed mode / static export: nothing to write. Tell client to fall back.
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const locale = body.locale === "en" || body.locale === "it" ? body.locale : "it";
  try {
    await db.collection("subscribers").doc(email).set(
      { email, locale, source: "notify-dialog", createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "write-failed" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
