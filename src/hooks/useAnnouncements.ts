"use client";

import { useEffect, useSyncExternalStore } from "react";
import { apiUrl } from "@/lib/api-base";
import { hasUnread, latestSentAt, type PublicAnnouncement } from "@/lib/push/announcements";

/**
 * Organizer announcements, shared by the header bell and the notifications
 * page: one request serves both, and marking them read in one place clears
 * the dot in the other.
 */
type Snapshot = {
  status: "idle" | "loading" | "ready" | "error";
  items: PublicAnnouncement[];
  /** sentAt of the newest announcement this browser has looked at. */
  seen: string | null;
};

const SEEN_KEY = "devfest-notifications-seen";
const SERVER: Snapshot = { status: "idle", items: [], seen: null };

let snapshot: Snapshot = SERVER;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;
let seenLoaded = false;
const listeners = new Set<() => void>();

function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fetch unless the list is younger than `maxAgeMs`. Concurrent calls share
 *  one request; a failed refresh keeps the list already shown. */
export function refreshAnnouncements(maxAgeMs = 0): Promise<void> {
  if (inflight) return inflight;
  if (snapshot.status === "ready" && Date.now() - fetchedAt < maxAgeMs) return Promise.resolve();
  if (snapshot.status !== "ready") update({ status: "loading" });
  inflight = (async () => {
    try {
      const res = await fetch(apiUrl("/api/announcements"), { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; announcements?: PublicAnnouncement[] };
      if (!res.ok || !data.ok) throw new Error(String(res.status));
      fetchedAt = Date.now();
      update({ status: "ready", items: data.announcements ?? [] });
    } catch {
      if (snapshot.status !== "ready") update({ status: "error" });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Record the newest announcement as read. */
export function markAnnouncementsSeen() {
  const latest = latestSentAt(snapshot.items);
  if (!latest || latest === snapshot.seen) return;
  try {
    localStorage.setItem(SEEN_KEY, latest);
  } catch {
    // Storage blocked: the dot just clears for this page view.
  }
  update({ seen: latest });
}

export function useAnnouncements() {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => SERVER);

  useEffect(() => {
    // localStorage only after hydration, so server and first client render
    // agree; read once for every component using the hook.
    if (!seenLoaded) {
      seenLoaded = true;
      try {
        update({ seen: localStorage.getItem(SEEN_KEY) });
      } catch {
        // Storage blocked: everything reads as unread.
      }
    }
    void refreshAnnouncements(60_000);

    // Back from the lock screen or another app: there may be news.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshAnnouncements(30_000);
    };
    // The service worker says a push just arrived: fetch it now.
    const onMessage = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "push") void refreshAnnouncements(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  return { ...snap, unread: hasUnread(snap.items, snap.seen) };
}
