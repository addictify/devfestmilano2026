/**
 * Running average for a session's rating.
 *
 * The individual responses can't be read by the public — they carry comments
 * and are keyed by uid — so the average can't be computed in the browser. It is
 * maintained on the parent `feedback/{sessionId}` document instead, which holds
 * nothing but counters and is therefore safe to read anonymously.
 *
 * Kept pure so the edit case is actually tested: a rating can be changed, and a
 * naive "+1 vote, +rating" would count the same person twice and inflate the
 * average every time they revise it.
 */
export type RatingAggregate = {
  /** Number of distinct people who rated. */
  count: number;
  /** Sum of their current ratings. */
  sum: number;
  /** sum / count, or 0 when nobody has rated. */
  average: number;
};

export const EMPTY_AGGREGATE: RatingAggregate = { count: 0, sum: 0, average: 0 };

/**
 * Below this many votes the average is withheld: with one or two responses
 * "the average" is just that person's rating, attributable to whoever was in
 * the room. Speakers see their full feedback in the organizer dashboard.
 */
export const MIN_PUBLIC_RATINGS = 3;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The aggregate after someone submits `rating`.
 *
 * `stored` is the parent document as it exists now (null if never written), and
 * `previousRating` is that same person's earlier rating, or null if this is
 * their first. When the parent document is missing but the person already had a
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
