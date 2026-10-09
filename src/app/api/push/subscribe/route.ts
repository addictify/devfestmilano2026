import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";
import { isValidSubscription, subscriptionId } from "@/lib/push/subscription";
import { PUSH_COLLECTION } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/**
 * Store (or refresh) a browser's push subscription.
 *
 * Open to anyone, signed in or not: announcements are for everyone at the
 * venue, and requiring an account to be told a room changed would be perverse.
 * A bearer token, when present, binds the row to a uid — that is what session
 * reminders need, because they follow the favourites of a specific person.
 */
export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const subscription = (body as { subscription?: unknown } | null)?.subscription;
  if (!isValidSubscription(subscription)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const locale = (body as { locale?: unknown }).locale === "en" ? "en" : "it";
  const uid = await verifyUser(req);
  const id = subscriptionId(subscription.endpoint);

  const ref = db.collection(PUSH_COLLECTION).doc(id);
  // createdAt is set once, on the first subscription of this browser, so the
  // dashboard can show sign-ups over time. updatedAt moves on every refresh.
  const isNew = !(await ref.get()).exists;

  await ref.set(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      locale,
      // Explicit delete rather than omit: signing out on a shared phone must
      // detach the row, not silently leave the previous person's uid on it.
      uid: uid ?? FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, id });
}

/** Forget a subscription. Unsubscribing must never need an account. */
export async function DELETE(req: Request) {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const endpoint = (body as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  await db.collection(PUSH_COLLECTION).doc(subscriptionId(endpoint)).delete();
  return NextResponse.json({ ok: true });
}
