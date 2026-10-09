import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/auth/cron-guard";
import { runSessionizeSync } from "@/lib/sessionize/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls speakers/sessions/tracks from Sessionize into Firestore. Triggered by
// Cloud Scheduler (Authorization: Bearer CRON_SECRET) or manually
// (?secret=REVALIDATE_SECRET); organizers use /api/admin/sync instead.
async function handler(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const outcome = await runSessionizeSync();
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
  }
  // `changed` lets a caller (and the logs) tell a no-op sync from one that
  // found something new.
  return NextResponse.json(outcome);
}

export { handler as GET, handler as POST };
