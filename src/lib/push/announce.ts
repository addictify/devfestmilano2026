import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { AnnouncementInput } from "./announcements";
import { allSubscriptions, sendToSubscriptions, type SendResult } from "./send";
import { announcementPayload } from "./subscription";

/**
 * Record an announcement and push it to every subscribed device — the one
 * path for both "send now" in the admin and the scheduled sender.
 */
export async function sendAnnouncement(
  db: Firestore,
  input: AnnouncementInput,
  sentBy: string,
): Promise<SendResult & { id: string }> {
  const { titleIt, bodyIt, titleEn, bodyEn } = input;

  // Written before sending, not after: each push links to this row, and
  // someone tapping one the moment it lands must find it already there.
  const ref = db.collection("announcements").doc();
  await ref.set({ ...input, sentBy, sentAt: FieldValue.serverTimestamp() });

  const subscriptions = await allSubscriptions(db);
  const result = await sendToSubscriptions(db, subscriptions, (subscription) =>
    subscription.locale === "en" && titleEn && bodyEn
      ? announcementPayload(titleEn, bodyEn, "en", ref.id)
      // No English copy written: send the Italian one rather than nothing.
      // A notification in the wrong language beats a room that wasn't told.
      : announcementPayload(titleIt, bodyIt, "it", ref.id),
  );

  // Deleted from the admin list while still sending: nothing left to annotate.
  await ref.update({ ...result }).catch(() => {});
  return { id: ref.id, ...result };
}
