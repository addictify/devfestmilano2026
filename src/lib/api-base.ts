/**
 * Where the API lives.
 *
 * On the static export the frontend is served from GitHub Pages while the route
 * handlers run as a Cloud Function, so calls have to be absolute and
 * cross-origin. Running the full Next app (dev, or a server deploy) keeps them
 * relative, which avoids needless CORS and works with no configuration.
 *
 * Set NEXT_PUBLIC_API_BASE_URL to the function URL for static builds. It's
 * inlined at build time, so changing it means rebuilding.
 */
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

/** Absolute API URL when a base is configured, same-origin path otherwise. */
export function apiUrl(path: string): string {
  if (!BASE) return path;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** True when the API is served from another origin (so cookies won't travel). */
export const apiIsCrossOrigin = BASE.length > 0;
