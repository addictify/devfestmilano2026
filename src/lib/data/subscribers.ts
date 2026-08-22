import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

export type SubscriberRow = { email: string; createdAt: string; locale: string; source: string };

export async function getSubscriberRows(): Promise<SubscriberRow[]> {
  const db = getAdminDb();
  if (!db) return [];
  // Credentials that parse but are rejected by Google (revoked key, wrong
  // project) only fail here, on the first real call — not at init. Without this
  // the admin dashboard and CSV export 500 instead of degrading, unlike every
  // other reader in this directory.
  let snap;
  try {
    snap = await db.collection("subscribers").get();
  } catch (error) {
    console.error("[subscribers] Firestore read failed:", error);
    return [];
  }
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const ts = x.createdAt as { toDate?: () => Date } | undefined;
    return {
      email: typeof x.email === "string" ? x.email : d.id,
      createdAt: ts?.toDate ? ts.toDate().toISOString() : "",
      locale: typeof x.locale === "string" ? x.locale : "",
      source: typeof x.source === "string" ? x.source : "",
    };
  });
}
