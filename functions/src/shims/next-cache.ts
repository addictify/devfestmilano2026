/**
 * `revalidatePath` has no meaning on a static export: there is no ISR cache to
 * invalidate. Content edits instead mark the site as having unpublished
 * changes, and an admin publishes when they're done — a rebuild per save would
 * waste minutes of CI and leave the public site mid-update.
 *
 * Calls are collected rather than recorded one by one: a single edit typically
 * invalidates half a dozen locale paths, and "6 unpublished changes" after two
 * edits would misrepresent what happened. index.ts records one entry per
 * request.
 */
let touched: string[] = [];

export function revalidatePath(path: string, _type?: string): void {
  if (!touched.includes(path)) touched.push(path);
}

export function revalidateTag(tag: string): void {
  revalidatePath(`tag:${tag}`);
}

/** Paths invalidated during this request, clearing the buffer. */
export function takeTouchedPaths(): string[] {
  const paths = touched;
  touched = [];
  return paths;
}
