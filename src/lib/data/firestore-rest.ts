/**
 * Reading published content without a service account.
 *
 * The static export is built in CI, which deliberately holds no admin
 * credentials — but a build that can't reach Firestore would bake the bundled
 * seed into the live site, so nothing an organizer edits in /admin would ever
 * appear. Firestore's REST API accepts the public web API key and is subject to
 * the same security rules as any anonymous client, so this reads exactly what
 * the rules already make world-readable (speakers, sessions, tracks, sponsors,
 * team, config/site) and nothing else.
 *
 * No credential is added to CI: an attacker with this key can read what any
 * visitor can already read.
 */

/** One field of a Firestore REST document. */
type RestValue = Record<string, unknown>;

/**
 * Firestore encodes every value as a single-key wrapper object. Integers
 * arrive as strings (they can exceed Number.MAX_SAFE_INTEGER), and maps and
 * arrays nest more wrappers, so this has to recurse.
 */
export function decodeValue(value: RestValue | undefined): unknown {
  if (!value || typeof value !== "object") return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue as string;
  if ("booleanValue" in value) return value.booleanValue as boolean;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue as string;
  if ("bytesValue" in value) return value.bytesValue as string;
  if ("referenceValue" in value) return value.referenceValue as string;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, RestValue> })?.fields ?? {};
    return decodeFields(fields);
  }
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: RestValue[] })?.values ?? [];
    return values.map((v) => decodeValue(v));
  }
  return undefined;
}

export function decodeFields(fields: Record<string, RestValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const decoded = decodeValue(value);
    if (decoded !== undefined) out[key] = decoded;
  }
  return out;
}

/** Last path segment of `projects/../documents/collection/docId`. */
export function docIdFromName(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1] ?? "";
}

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export const publicReadConfigured = Boolean(PROJECT && API_KEY);

function base() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
}

/**
 * All documents in a collection, or null when unavailable — null means "no
 * answer", so callers can fall back to seed rather than publishing an empty
 * section.
 */
export async function readPublicCollection(
  collection: string,
): Promise<Array<Record<string, unknown>> | null> {
  if (!publicReadConfigured) return null;
  const docs: Array<Record<string, unknown>> = [];
  let pageToken: string | undefined;

  try {
    do {
      const url = new URL(`${base()}/${collection}`);
      url.searchParams.set("key", API_KEY as string);
      url.searchParams.set("pageSize", "300");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) {
        // 403 here is the normal answer for a collection the rules keep
        // private; it isn't a misconfiguration worth failing the build over.
        console.warn(`[firestore-rest] ${collection}: HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as {
        documents?: Array<{ name: string; fields?: Record<string, RestValue> }>;
        nextPageToken?: string;
      };
      for (const d of json.documents ?? []) {
        docs.push({ id: docIdFromName(d.name), ...decodeFields(d.fields ?? {}) });
      }
      pageToken = json.nextPageToken;
    } while (pageToken);
  } catch (error) {
    console.warn(`[firestore-rest] ${collection} failed:`, error);
    return null;
  }

  return docs;
}

/** A single document, or null when missing or unreachable. */
export async function readPublicDoc(
  path: string,
): Promise<Record<string, unknown> | null> {
  if (!publicReadConfigured) return null;
  try {
    const url = new URL(`${base()}/${path}`);
    url.searchParams.set("key", API_KEY as string);
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { fields?: Record<string, RestValue> };
    return decodeFields(json.fields ?? {});
  } catch {
    return null;
  }
}
