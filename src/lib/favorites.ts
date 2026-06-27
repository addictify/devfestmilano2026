export const FAVORITES_LS_KEY = "devfest:favorites";

export function readLocal(): string[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(FAVORITES_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeLocal(ids: string[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FAVORITES_LS_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / unavailable
  }
}

/** Unique union, first-seen order preserved (local first, then cloud). */
export function mergeFavorites(local: string[], cloud: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...local, ...cloud]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
