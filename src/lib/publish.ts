import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Publishing the static site.
 *
 * Content edits don't rebuild on their own: an organizer usually changes
 * several things in a row, and each rebuild costs minutes of CI and leaves the
 * public site briefly mid-update. Edits mark the site as having unpublished
 * changes; publishing is an explicit action.
 *
 * State lives in Firestore rather than memory because the API runs on
 * short-lived function instances — anything in-process is gone by the next
 * request.
 */

const DOC = ["config", "publish"] as const;

export type PublishState = {
  /** ISO time of the first unpublished edit, or null when nothing is pending. */
  pendingSince: string | null;
  /** How many edits have landed since the last publish. */
  pendingCount: number;
  /** Short labels of what changed, newest first, for the admin banner. */
  pendingChanges: string[];
  lastPublishedAt: string | null;
  lastPublishOk: boolean | null;
};

const EMPTY: PublishState = {
  pendingSince: null,
  pendingCount: 0,
  pendingChanges: [],
  lastPublishedAt: null,
  lastPublishOk: null,
};

// Enough to tell what's waiting without letting the list grow forever.
const MAX_LISTED_CHANGES = 8;

export async function getPublishState(): Promise<PublishState> {
  const db = getAdminDb();
  if (!db) return EMPTY;
  try {
    const snap = await db.collection(DOC[0]).doc(DOC[1]).get();
    return { ...EMPTY, ...(snap.data() as Partial<PublishState> | undefined) };
  } catch {
    // A dashboard that can't read this shouldn't take the whole panel down.
    return EMPTY;
  }
}

/** Record that something changed and the live site no longer reflects it. */
export async function markPendingPublish(change: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const ref = db.collection(DOC[0]).doc(DOC[1]);
  try {
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as Partial<PublishState> | undefined;
      const changes = [change, ...(current?.pendingChanges ?? [])].slice(0, MAX_LISTED_CHANGES);
      tx.set(
        ref,
        {
          pendingSince: current?.pendingSince ?? new Date().toISOString(),
          pendingCount: (current?.pendingCount ?? 0) + 1,
          pendingChanges: changes,
        },
        { merge: true },
      );
    });
  } catch (error) {
    // The edit itself already succeeded; losing the marker only means the
    // banner won't nag, which must never fail the write the admin asked for.
    console.error("[publish] could not mark pending:", error);
  }
}

async function clearPending(ok: boolean): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db
    .collection(DOC[0])
    .doc(DOC[1])
    .set(
      {
        pendingSince: null,
        pendingCount: 0,
        pendingChanges: [],
        lastPublishedAt: new Date().toISOString(),
        lastPublishOk: ok,
      },
      { merge: true },
    );
}

const REPO = process.env.GITHUB_REPOSITORY ?? "addictify/devfestmilano2026";
const WORKFLOW = process.env.GITHUB_REBUILD_WORKFLOW ?? "pages.yml";
const REF = process.env.GITHUB_REBUILD_REF ?? "main";

export type PublishResult =
  | { ok: true }
  | { ok: false; reason: "no-token" | "dispatch-failed"; detail?: string };

/**
 * Ask GitHub Actions to rebuild and redeploy the site.
 *
 * Pending state is only cleared on success, so a failed publish leaves the
 * banner up rather than quietly pretending the site is current.
 */
export async function publishSite(reason: string): Promise<PublishResult> {
  const token = process.env.GITHUB_REBUILD_TOKEN;
  if (!token) return { ok: false, reason: "no-token" };

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ref: REF, inputs: { reason: reason.slice(0, 90) } }),
      },
    );
    if (!res.ok) {
      return { ok: false, reason: "dispatch-failed", detail: `${res.status} ${await res.text()}` };
    }
  } catch (error) {
    return { ok: false, reason: "dispatch-failed", detail: String(error) };
  }

  await clearPending(true);
  return { ok: true };
}
