import "server-only";
import webpush from "web-push";
import type { Firestore } from "firebase-admin/firestore";
import {
  isGoneStatus,
  type PushPayload,
  type PushSubscriptionRecord,
} from "./subscription";

export const PUSH_COLLECTION = "pushSubscriptions";

let configured: boolean | null = null;

/**
 * Whether VAPID credentials are present, configuring web-push on first use.
 *
 * Cached rather than re-read: `setVapidDetails` throws on a malformed key, and
 * one bad configuration shouldn't be retried (and re-logged) on every send.
 */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@devfestmilano.it";
  if (!publicKey || !privateKey) {
    configured = false;
    return configured;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error("[push] VAPID configuration rejected:", error);
    configured = false;
  }
  return configured;
}

export type SendResult = { sent: number; gone: number; failed: number };

/**
 * Deliver one payload to many subscriptions.
 *
 * Sends run concurrently in batches, because a push service that has gone slow
 * shouldn't hold up the rest of the room — during a session change this runs
 * against every device at the venue and has a scheduler tick to fit inside.
 *
 * Endpoints the push service reports as gone (404/410) are deleted. Every
 * other failure leaves the row alone: a rate limit is not consent withdrawn.
 */
export async function sendToSubscriptions(
  db: Firestore,
  subscriptions: (PushSubscriptionRecord & { id: string })[],
  payloadFor: (subscription: PushSubscriptionRecord) => PushPayload,
): Promise<SendResult> {
  if (!isPushConfigured()) return { sent: 0, gone: 0, failed: subscriptions.length };

  const result: SendResult = { sent: 0, gone: 0, failed: 0 };
  const stale: string[] = [];
  const BATCH = 50;

  for (let i = 0; i < subscriptions.length; i += BATCH) {
    const batch = subscriptions.slice(i, i + BATCH);
    const outcomes = await Promise.allSettled(
      batch.map((subscription) =>
        webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify(payloadFor(subscription)),
          { TTL: 600 },
        ),
      ),
    );
    outcomes.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") {
        result.sent += 1;
        return;
      }
      const status = (outcome.reason as { statusCode?: number })?.statusCode;
      if (isGoneStatus(status)) {
        result.gone += 1;
        stale.push(batch[index].id);
      } else {
        result.failed += 1;
        console.error("[push] send failed:", status, outcome.reason);
      }
    });
  }

  for (let i = 0; i < stale.length; i += 400) {
    const batch = db.batch();
    for (const id of stale.slice(i, i + 400)) {
      batch.delete(db.collection(PUSH_COLLECTION).doc(id));
    }
    await batch.commit();
  }

  return result;
}

/** Every stored subscription. */
export async function allSubscriptions(
  db: Firestore,
): Promise<(PushSubscriptionRecord & { id: string })[]> {
  const snap = await db.collection(PUSH_COLLECTION).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as PushSubscriptionRecord),
  }));
}
