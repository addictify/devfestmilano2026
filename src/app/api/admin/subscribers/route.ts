import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { getSubscriberRows } from "@/lib/data/subscribers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, rows: await getSubscriberRows() });
}
