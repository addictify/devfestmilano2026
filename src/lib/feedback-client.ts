"use client";

import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { PublicRating } from "@/lib/feedback-aggregate";

/**
 * Public rating counters, fetched once per page load and shared.
 *
 * The agenda renders ~30 cards. One query for the whole `feedback` collection
 * costs a fraction of thirty per-card reads, so every card awaits the same
 * promise rather than asking for its own document. Cached at module scope: the
 * cache dies with the page, which is the right lifetime for a number that only
 * moves when someone in the room rates a talk.
 */
let pending: Promise<Map<string, PublicRating>> | null = null;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function loadRatings(): Promise<Map<string, PublicRating>> {
  if (pending) return pending;
  const db = getDb();
  // Seed content / static export with no Firebase: no ratings, not an error.
  if (!db) return Promise.resolve(new Map());

  pending = getDocs(collection(db, "feedback"))
    .then((snap) => {
      const map = new Map<string, PublicRating>();
      snap.forEach((doc) => {
        const data = doc.data();
        // The average is published only when it is safe to publish; it is not
        // recomputed here, because the numbers it would need are server-side.
        map.set(doc.id, {
          count: finite(data.count),
          ...(typeof data.average === "number" && Number.isFinite(data.average)
            ? { average: data.average }
            : {}),
        });
      });
      return map;
    })
    .catch(() => {
      // Rules deny it, offline, or the collection doesn't exist yet. A missing
      // rating must never break a session card.
      pending = null;
      return new Map<string, PublicRating>();
    });

  return pending;
}

/** Call after submitting feedback so the next read reflects the new vote. */
export function invalidateRatings(): void {
  pending = null;
}
