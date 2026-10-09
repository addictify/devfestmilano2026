/**
 * Pure arithmetic behind the organizer dashboard.
 *
 * Kept apart from the route so the decisions that are easy to get subtly wrong
 * (which day a 00:30 sign-up belongs to, what "active in the last week" means,
 * where a bucket edge falls) are checked by tests instead of by squinting at a
 * chart on the morning of the event.
 */

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `2026-10-10` on the event's wall clock, whatever zone the server runs in. */
export function romeDay(date: Date): string {
  return DAY_FORMAT.format(date);
}

/** Dates grouped by Rome calendar day, oldest first. Days with none are absent. */
export function countByDay(dates: Date[]): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    if (Number.isNaN(d.getTime())) continue;
    const day = romeDay(d);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
}

/** How many dates fall within `windowMs` before `now` (future dates excluded). */
export function countWithin(dates: Date[], now: Date, windowMs: number): number {
  const from = now.getTime() - windowMs;
  return dates.filter((d) => {
    const t = d.getTime();
    return t >= from && t <= now.getTime();
  }).length;
}

/** `part` as a whole-number percentage of `whole`; 0 when there is no whole. */
export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** People grouped by how many sessions they saved. */
export function savedBuckets(
  perUser: number[],
): { label: string; count: number }[] {
  const buckets = [
    { label: "1", min: 1, max: 1, count: 0 },
    { label: "2–3", min: 2, max: 3, count: 0 },
    { label: "4–6", min: 4, max: 6, count: 0 },
    { label: "7+", min: 7, max: Infinity, count: 0 },
  ];
  for (const n of perUser) {
    const b = buckets.find((x) => n >= x.min && n <= x.max);
    if (b) b.count++;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

/** Players who scanned at least N checkpoints, for each threshold. */
export function scanThresholds(
  perPlayer: number[],
  thresholds: number[] = [1, 3, 5],
): { atLeast: number; players: number }[] {
  return thresholds.map((atLeast) => ({
    atLeast,
    players: perPlayer.filter((n) => n >= atLeast).length,
  }));
}

/** The `n` highest entries of a count map, ties broken by key for stability. */
export function topN(counts: Map<string, number>, n: number): { id: string; count: number }[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([id, count]) => ({ id, count }));
}

/** Add one to a key of a count map. */
export function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/** Mean of a list, one decimal; 0 for an empty list. */
export function mean1(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
