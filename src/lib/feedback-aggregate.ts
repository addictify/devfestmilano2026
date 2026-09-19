/**
 * Running average for a session's rating.
 *
 * The individual responses can't be read by the public — they carry comments
 * and are keyed by uid — so the average can't be computed in the browser. It is
 * maintained server-side instead, in two documents:
 *
 * - `feedback/{sessionId}/totals/aggregate` — the running count and sum. Never
 *   readable by a client (rules don't cascade into subcollections).
 * - `feedback/{sessionId}` — the published view: the count, plus the average
 *   only once enough people have voted. World-readable.
 *
 * The split is the whole point. Firestore rules grant or deny a *document*,
 * never a field, so a sum sitting next to a count of 1 is one division away
 * from that person's rating no matter what the UI chooses to render. Hiding it
 * in the component would have been a curtain, not a control: the first version
 * of this file published `{sum: 5, count: 1}` to anyone who asked.
 *
 * Kept pure so the edit case is actually tested: a rating can be changed, and a
 * naive "+1 vote, +rating" would count the same person twice and inflate the
 * average every time they revise it.
 */
export type RatingAggregate = {
  /** Number of distinct people who rated. */
  count: number;
  /** Sum of their current ratings. Server-side only. */
  sum: number;
  /** sum / count, or 0 when nobody has rated. Server-side only. */
  average: number;
};

/** What anyone may read: no sum, and no average until it stops identifying. */
export type PublicRating = {
  count: number;
  /** Absent below MIN_PUBLIC_RATINGS. */
  average?: number;
};

export const EMPTY_AGGREGATE: RatingAggregate = { count: 0, sum: 0, average: 0 };

/**
 * Below this many votes the average is withheld: with one or two responses
 * "the average" is just that person's rating, attributable to whoever was in
 * the room. Speakers see their full feedback in the organizer dashboard.
 */
export const MIN_PUBLIC_RATINGS = 3;

/**
 * The publishable projection of an aggregate.
 *
 * The count is harmless on its own — knowing three people rated a talk says
 * nothing about what they said — so it is always published, and the average
 * joins it only once it averages enough people to stop being anyone's.
 */
export function publicRating(aggregate: RatingAggregate): PublicRating {
  if (aggregate.count < MIN_PUBLIC_RATINGS) return { count: aggregate.count };
  return { count: aggregate.count, average: aggregate.average };
}

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The aggregate after someone submits `rating`.
 *
 * `stored` is the totals document as it exists now (null if never written), and
 * `previousRating` is that same person's earlier rating, or null if this is
 * their first. When the totals document is missing but the person already had a
 * response, their vote is taken as the whole of the aggregate — that is the
 * shape of data written before this counter existed.
 */
export function nextAggregate(
  stored: Partial<RatingAggregate> | null | undefined,
  previousRating: number | null,
  rating: number,
): RatingAggregate {
  const hadResponse = previousRating !== null;
  const count = stored ? finite(stored.count) : hadResponse ? 1 : 0;
  const sum = stored ? finite(stored.sum) : hadResponse ? finite(previousRating) : 0;

  const nextCount = hadResponse ? Math.max(count, 1) : count + 1;
  const nextSum = sum - (hadResponse ? finite(previousRating) : 0) + rating;

  return {
    count: nextCount,
    sum: nextSum,
    average: nextCount > 0 ? nextSum / nextCount : 0,
  };
}

/** Rounded to one decimal, the way it is shown. */
export function formatAverage(average: number): string {
  return (Math.round(average * 10) / 10).toFixed(1);
}
