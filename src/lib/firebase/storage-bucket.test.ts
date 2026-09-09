import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The bucket name has to resolve from what the Cloud Function runtime actually
 * provides. NEXT_PUBLIC_* is inlined by Next at build time and simply isn't
 * there, which is how uploads came to fail in production while passing locally.
 */
async function resolve(env: Record<string, string | undefined>) {
  vi.resetModules();
  const original = { ...process.env };
  for (const k of [
    "FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "FIREBASE_CONFIG",
    "GCLOUD_PROJECT",
    "FIREBASE_ADMIN_PROJECT_ID",
  ]) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
  const mod = await import("@/lib/firebase/admin");
  const name = (mod as unknown as { __storageBucketNameForTest?: () => string | null })
    .__storageBucketNameForTest?.();
  process.env = original;
  return name;
}

afterEach(() => vi.resetModules());

describe("storage bucket resolution", () => {
  it("prefers an explicit server-side variable", async () => {
    expect(
      await resolve({ FIREBASE_STORAGE_BUCKET: "explicit.appspot.com", GCLOUD_PROJECT: "p" }),
    ).toBe("explicit.appspot.com");
  });

  it("falls back to FIREBASE_CONFIG, which Cloud Functions injects", async () => {
    expect(
      await resolve({ FIREBASE_CONFIG: JSON.stringify({ storageBucket: "from-config.firebasestorage.app" }) }),
    ).toBe("from-config.firebasestorage.app");
  });

  it("derives from the project id when nothing else is present", async () => {
    expect(await resolve({ GCLOUD_PROJECT: "devfestmilano26" })).toBe(
      "devfestmilano26.firebasestorage.app",
    );
  });

  it("survives malformed FIREBASE_CONFIG rather than throwing", async () => {
    expect(await resolve({ FIREBASE_CONFIG: "{not json", GCLOUD_PROJECT: "p" })).toBe(
      "p.firebasestorage.app",
    );
  });

  it("returns null when there is genuinely nothing to go on", async () => {
    expect(await resolve({})).toBeNull();
  });
});
