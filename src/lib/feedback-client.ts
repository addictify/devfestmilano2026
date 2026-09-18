"use client";

import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { RatingAggregate } from "@/lib/feedback-aggregate";

/**
 * Public rating counters, fetched once per page load and shared.
 *
 * The agenda renders ~30 cards. One query for the whole `feedback` collection
 * costs a fraction of thirty per-card reads, so every card awaits the same
 * promise rather than asking for its own document. Cached at module scope: the
 * cache dies with the page, which is the right lifetime for a number that only
 * moves when someone in the room rates a talk.
 */
let pending: Promise<Map<string, RatingAggregate>> | null = null;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function loadRatings(): Promise<Map<string, RatingAggregate>> {
  if (pending) return pending;
  const db = getDb();
  // Seed content / static export with no Firebase: no ratings, not an error.
  if (!db) return Promise.resolve(new Map());

  pending = getDocs(collection(db, "feedback"))
    .then((snap) => {
      const map = new Map<string, RatingAggregate>();
      snap.forEach((doc) => {
        const data = doc.data();
        const count = finite(data.count);
        const sum = finite(data.sum);
        map.set(doc.id, {
          count,
          sum,
          average: count > 0 ? sum / count : 0,
        });
      });
      return map;
    })
    .catch(() => {
      // Rules deny it, offline, or the collection doesn't exist yet. A missing
      // rating must never break a session card.
      pending = null;
      return new Map<string, RatingAggregate>();
    });

  return pending;
}

/** Call after submitting feedback so the next read reflects the new vote. */
export function invalidateRatings(): void {
  pending = null;
}
