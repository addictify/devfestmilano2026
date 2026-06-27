import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { LocalizedString } from "@/types/models";

export type Badge = { id: string; name: LocalizedString; description: LocalizedString; icon: string; milestone?: number };
export type Checkpoint = {
  id: string; name: LocalizedString; points: number; badgeId?: string; active: boolean; secret: string;
  question?: LocalizedString; answer?: string; quizMode?: "add" | "multiply"; quizValue?: number; wrongPenalty?: number;
};

async function readAll<T extends { id: string }>(collection: string): Promise<T[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection(collection).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  } catch {
    return [];
  }
}

export const getBadges = () => readAll<Badge>("badges");
export const getCheckpoints = () => readAll<Checkpoint>("checkpoints");
