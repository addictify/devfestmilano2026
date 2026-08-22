import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

/**
 * Rebuilding the static site after content changes.
 *
 * With the frontend on GitHub Pages, published content is baked at build time.
 * Anything that used to call revalidatePath() now has to ask GitHub Actions to
 * rebuild instead, otherwise an admin edit would be invisible until the next
 * push.
 */

export const GITHUB_TOKEN = defineSecret("GITHUB_REBUILD_TOKEN");

const REPO = process.env.GITHUB_REPOSITORY ?? "addictify/devfestmilano2026";
const WORKFLOW = process.env.GITHUB_REBUILD_WORKFLOW ?? "deploy-pages.yml";
const REF = process.env.GITHUB_REBUILD_REF ?? "main";

// Collected per request, so one handler touching several paths still results in
// a single rebuild.
let stalePaths: string[] = [];

export function markSiteStale(path: string): void {
  if (!stalePaths.includes(path)) stalePaths.push(path);
}

export function takeStalePaths(): string[] {
  const paths = stalePaths;
  stalePaths = [];
  return paths;
}

/**
 * Fire a workflow_dispatch. Never throws: a failed rebuild must not turn a
 * successful admin edit into an error — the data is already saved, and the
 * worst case is the public site lagging until the next deploy.
 */
export async function requestSiteRebuild(reason: string): Promise<boolean> {
  const token = GITHUB_TOKEN.value();
  if (!token) {
    logger.warn("[rebuild] no GITHUB_REBUILD_TOKEN set — skipping", { reason });
    return false;
  }
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
      logger.error("[rebuild] dispatch refused", { status: res.status, body: await res.text() });
      return false;
    }
    logger.info("[rebuild] requested", { reason });
    return true;
  } catch (error) {
    logger.error("[rebuild] dispatch failed", { error: String(error) });
    return false;
  }
}
