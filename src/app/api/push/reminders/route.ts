import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessions } from "@/lib/data/content";
import { reminderPayload, sessionsDueForReminder } from "@/lib/push/subscription";
import { allSubscriptions, isPushConfigured, sendToSubscriptions } from "@/lib/push/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Minutes of warning before a talk starts. */
const LEAD_MINUTES = 15;
/** Must match the scheduler interval, or windows overlap or leave a gap. */
const INTERVAL_MINUTES = 5;

function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = new URL(request.url).searchParams.get("secret");
  return Boolean(process.env.REVALIDATE_SECRET && secret === process.env.REVALIDATE_SECRET);
}

/**
 * Remind people about the talks they saved, shortly before those talks start.
 *
 * Runs every few minutes on the day. Each run covers a half-open window of
 * start times, so a talk falls in exactly one run: overlapping windows would
 * buzz twice, and a gap would skip a session with nobody noticing until the
 * room was half empty.
 *
 * Only signed-in subscribers get these — a favourite belongs to an account.
 * Everyone else still receives announcements.
 */
async function handler(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, reason: "no-vapid" }, { status: 503 });
  }

  const sessions = await getSessions();
  const due = sessionsDueForReminder(sessions, new Date(), LEAD_MINUTES, INTERVAL_MINUTES);
  if (due.length === 0) {
    return NextResponse.json({ ok: true, due: 0, sent: 0 });
  }

  // Only subscriptions bound to an account can be matched to favourites.
  const subscriptions = (await allSubscriptions(db)).filter((s) => s.uid);
  if (subscriptions.length === 0) {
    return NextResponse.json({ ok: true, due: due.length, sent: 0 });
  }

  const byUid = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    const list = byUid.get(subscription.uid!) ?? [];
    list.push(subscription);
    byUid.set(subscription.uid!, list);
  }

  // One read per subscribed account, not per account in the database: on the
  // day this runs every five minutes and most people never subscribed.
  const favouritesByUid = new Map<string, Set<string>>();
  await Promise.all(
    [...byUid.keys()].map(async (uid) => {
      const snap = await db.collection("users").doc(uid).collection("favorites").get();
      favouritesByUid.set(uid, new Set(snap.docs.map((d) => d.id)));
    }),
  );

  const result = { sent: 0, gone: 0, failed: 0 };
  for (const session of due) {
    const targets = subscriptions.filter((s) =>
      favouritesByUid.get(s.uid!)?.has(session.id),
    );
    if (targets.length === 0) continue;
    const outcome = await sendToSubscriptions(db, targets, (subscription) =>
      reminderPayload(session, LEAD_MINUTES, subscription.locale),
    );
    result.sent += outcome.sent;
    result.gone += outcome.gone;
    result.failed += outcome.failed;
  }

  return NextResponse.json({ ok: true, due: due.length, ...result });
}

export const GET = handler;
export const POST = handler;
