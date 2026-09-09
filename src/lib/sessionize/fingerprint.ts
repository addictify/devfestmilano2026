import { createHash } from "node:crypto";

/**
 * A stable digest of synced content.
 *
 * The scheduled sync runs every hour regardless of whether Sessionize changed.
 * Without a way to tell "same data again" from "new talk added", every run
 * would mark the site as needing a rebuild and the admin banner would nag
 * forever — which is how people learn to ignore it.
 *
 * Keys are sorted so an unchanged payload always hashes the same, no matter
 * what order the API returned things in.
 */
export function contentFingerprint(content: unknown): string {
  return createHash("sha256").update(stableStringify(content)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}
