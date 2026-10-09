/**
 * The few things the site counts about itself.
 *
 * Counters only: no identifier, no timestamp finer than a day, nothing that can
 * be tied back to a person. That is what keeps this outside the consent rules
 * that real analytics need, and it is why the list is closed — a new event is a
 * decision about what to learn, made here, not something a client can invent.
 *
 * The notification events answer a question the server can't see on its own: a
 * refusal leaves no row anywhere, so "how many people said no" only exists if
 * the browser reports it.
 */
export const TRACK_EVENTS = [
  "push_prompted", // tapped "enable": the browser's permission dialog opened
  "push_accepted", // …and they allowed it
  "push_denied", // …and they refused (permanent: the browser stops asking)
  "push_dismissed", // …and closed it without answering
  "push_blocked", // arrived already refused in an earlier visit
  "push_unsupported", // browser or device can't do Web Push at all
  "push_ios_needs_install", // iPhone/iPad Safari tab: needs Add to Home Screen first
] as const;

export type TrackEvent = (typeof TRACK_EVENTS)[number];

export function isTrackEvent(value: unknown): value is TrackEvent {
  return typeof value === "string" && (TRACK_EVENTS as readonly string[]).includes(value);
}

/** Events that describe a device's standing state rather than an action. A
 *  reload must not count again, so these are reported once per device. */
export const ONCE_PER_DEVICE: ReadonlySet<TrackEvent> = new Set([
  "push_blocked",
  "push_unsupported",
  "push_ios_needs_install",
]);
