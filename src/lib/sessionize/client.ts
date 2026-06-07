import type { SzAll } from "./types";

/**
 * Fetch the full Sessionize event view. The event id comes from
 * SESSIONIZE_EVENT_ID (server) — the short code in the Sessionize URL.
 */
export async function fetchSessionizeAll(
  eventId = process.env.SESSIONIZE_EVENT_ID,
): Promise<SzAll | null> {
  if (!eventId) return null;
  const url = `https://sessionize.com/api/v2/${eventId}/view/All`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Sessionize ${eventId} responded ${res.status}`);
  }
  return (await res.json()) as SzAll;
}
