/**
 * App icon URLs, versioned. Bump ICON_VERSION when the artwork changes:
 * installed apps only pick up a new icon when the manifest itself changes —
 * same URLs with new pixels looks like no change at all — and the query
 * string also gets past HTTP and service-worker caches.
 */
export const ICON_VERSION = "2";

export const iconUrl = (file: string) => `/icons/${file}?v=${ICON_VERSION}`;
