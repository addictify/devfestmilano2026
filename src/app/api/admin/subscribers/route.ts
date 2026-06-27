import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

type Row = { email: string; createdAt: string; locale: string; source: string };

async function rows(): Promise<Row[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("subscribers").get();
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const ts = x.createdAt as { toDate?: () => Date } | undefined;
    return {
      email: typeof x.email === "string" ? x.email : d.id,
      createdAt: ts?.toDate ? ts.toDate().toISOString() : "",
      locale: typeof x.locale === "string" ? x.locale : "",
      source: typeof x.source === "string" ? x.source : "",
    };
  });
}

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, rows: await rows() });
}

export { rows };
