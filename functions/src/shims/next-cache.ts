/**
 * `revalidatePath` has no meaning here: the site is a static export on GitHub
 * Pages, so there is no ISR cache to invalidate. Refreshing published content
 * means rebuilding the site, which is what requestSiteRebuild does.
 *
 * Calls are collected during a request and acted on once at the end, so a
 * handler touching five paths triggers one rebuild, not five.
 */
import { markSiteStale } from "../rebuild.js";

export function revalidatePath(path: string, _type?: string): void {
  markSiteStale(path);
}

export function revalidateTag(tag: string): void {
  markSiteStale(`tag:${tag}`);
}
