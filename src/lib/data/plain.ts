import "server-only";

/**
 * Make a Firestore document safe to hand to a Client Component.
 *
 * Synced documents carry a Firestore Timestamp (`syncedAt`), and React refuses
 * to serialize class instances across the server/client boundary — the speakers
 * page failed to render outright once real synced data replaced the seed, which
 * has no timestamps. Timestamps become ISO strings; everything else passes
 * through untouched.
 */
export function toPlainObject(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  // Firestore Timestamps are class instances exposing toDate().
  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(toPlainObject);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toPlainObject(v)]),
  );
}
