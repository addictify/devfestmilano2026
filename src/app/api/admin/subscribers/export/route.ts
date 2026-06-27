import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const snap = await db.collection("subscribers").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const ts = x.createdAt as { toDate?: () => Date } | undefined;
    return {
      email: typeof x.email === "string" ? x.email : d.id,
      createdAt: ts?.toDate ? ts.toDate().toISOString() : "",
      locale: typeof x.locale === "string" ? x.locale : "",
      source: typeof x.source === "string" ? x.source : "",
    };
  });
  const csv = toCsv(rows, ["email", "createdAt", "locale", "source"]);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="subscribers.csv"',
    },
  });
}
