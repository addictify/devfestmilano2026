import { createHash } from "node:crypto";

/**
 * Web Push plumbing that doesn't need a network or a database.
 *
 * Kept pure because the interesting parts — which sessions are due a reminder,
 * and which stored rows a failed send should retire — are decisions, and a
 * decision about a push notification is hard to inspect once it has been made:
 * the person either got a buzz in their pocket at the wrong moment or didn't.
 */

/** A browser's push endpoint and the keys to encrypt for it. */
export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** Set when the subscriber was signed in, which is what reminders need. */
  uid?: string;
  locale: "it" | "en";
};

/**
 * Firestore document id for a subscription.
 *
 * Endpoints are URLs, often well past Firestore's 1500-byte key limit and
 * containing "/", so they can't be the id. Hashing gives a stable id: the same
 * browser re-subscribing updates its row instead of accumulating duplicates
 * and buzzing someone twice for one talk.
 */
export function subscriptionId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

/** Whether a parsed body is a usable subscription. */
export function isValidSubscription(value: unknown): value is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.endpoint !== "string" || !v.endpoint.startsWith("https://")) {
    return false;
  }
  const keys = v.keys;
  if (typeof keys !== "object" || keys === null) return false;
  const k = keys as Record<string, unknown>;
  return (
    typeof k.p256dh === "string" &&
    k.p256dh.length > 0 &&
    typeof k.auth === "string" &&
    k.auth.length > 0
  );
}

/** What the service worker receives and renders. */
export type PushPayload = {
  title: string;
  body: string;
  /** Path to open on click, locale-prefixed. */
  url: string;
  tag: string;
};

const MAX_TITLE = 80;
const MAX_BODY = 180;

/** Trim to what a notification actually shows, on a word boundary if it can. */
export function clampText(value: string, max: number): string {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function announcementPayload(
  title: string,
  body: string,
  locale: "it" | "en",
): PushPayload {
  return {
    title: clampText(title, MAX_TITLE),
    body: clampText(body, MAX_BODY),
    url: `/${locale}/agenda`,
    // One tag for all announcements: a later one replaces an unread earlier
    // one rather than stacking a column of them on the lock screen.
    tag: "devfest-announcement",
  };
}

const REMINDER_COPY = {
  it: (minutes: number) => `Inizia tra ${minutes} minuti`,
  en: (minutes: number) => `Starts in ${minutes} minutes`,
} as const;

export function reminderPayload(
  session: { id: string; title: string; roomName?: string },
  minutes: number,
  locale: "it" | "en",
): PushPayload {
  const when = REMINDER_COPY[locale](minutes);
  return {
    title: clampText(session.title, MAX_TITLE),
    body: clampText(session.roomName ? `${when} · ${session.roomName}` : when, MAX_BODY),
    url: `/${locale}/my-schedule`,
    // Per session, so two reminders for the same talk can never double-buzz.
    tag: `devfest-session-${session.id}`,
  };
}

/**
 * Sessions starting inside the reminder window.
 *
 * The window is half-open — `[now + lead, now + lead + interval)` — and must
 * match the interval the job runs at. Overlapping windows would remind twice;
 * a gap would skip a talk silently, which is the failure nobody notices until
 * the room is empty.
 */
export function sessionsDueForReminder<
  T extends { startsAt: string | null; isServiceSession: boolean },
>(sessions: T[], now: Date, leadMinutes: number, intervalMinutes: number): T[] {
  const from = now.getTime() + leadMinutes * 60_000;
  const to = from + intervalMinutes * 60_000;
  return sessions.filter((s) => {
    if (s.isServiceSession || !s.startsAt) return false;
    const start = new Date(s.startsAt).getTime();
    return Number.isFinite(start) && start >= from && start < to;
  });
}

/**
 * Whether a failed send means the subscription is gone for good.
 *
 * 404 and 410 are the push service saying this endpoint no longer exists —
 * browser uninstalled, permission revoked, profile wiped. Anything else
 * (rate limits, 5xx) is worth keeping, because deleting on a transient error
 * would quietly unsubscribe people who did nothing wrong.
 */
export function isGoneStatus(status: number | undefined): boolean {
  return status === 404 || status === 410;
}
