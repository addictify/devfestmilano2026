import { apiUrl } from "@/lib/api-base";
import { ONCE_PER_DEVICE, type TrackEvent } from "@/lib/track";

const SEEN_KEY = "devfest-tracked";

function alreadyReported(event: TrackEvent): boolean {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
    if (seen.includes(event)) return true;
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, event]));
  } catch {
    // Storage blocked: report anyway. A rare double count beats losing the signal.
  }
  return false;
}

/**
 * Count one event. Fire and forget: a counter must never slow a tap down or
 * surface an error to someone who just wanted to turn notifications on.
 */
export function track(event: TrackEvent): void {
  if (typeof window === "undefined") return;
  if (ONCE_PER_DEVICE.has(event) && alreadyReported(event)) return;
  void fetch(apiUrl("/api/track"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}
