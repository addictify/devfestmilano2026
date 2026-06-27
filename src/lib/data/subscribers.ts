import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

export type SubscriberRow = { email: string; createdAt: string; locale: string; source: string };

export async function getSubscriberRows(): Promise<SubscriberRow[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("subscribers").get();
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
