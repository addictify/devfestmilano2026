import { NextResponse } from "next/server";
import { verifyAdminIdentity } from "@/lib/auth/admin-guard";
import { getPublishState, publishSite } from "@/lib/publish";

export const dynamic = "force-dynamic";

/** Publishing state for the admin banner. */
export async function GET(req: Request) {
  if (!(await verifyAdminIdentity(req))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true, state: await getPublishState() });
}

/** Trigger the rebuild. Deliberate and explicit — edits never do this. */
export async function POST(req: Request) {
  const caller = await verifyAdminIdentity(req);
  if (!caller) return NextResponse.json({ ok: false }, { status: 403 });

  const result = await publishSite(`published by ${caller.email ?? caller.uid}`);
  if (!result.ok) {
    // 503 rather than 500: nothing is broken, the site just can't be published
    // right now (usually a missing GITHUB_REBUILD_TOKEN).
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 503 });
  }
  return NextResponse.json({ ok: true, state: await getPublishState() });
}
