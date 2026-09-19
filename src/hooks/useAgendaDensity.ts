"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "devfest:agenda-density";

/**
 * Whether the agenda renders compact rows, remembered per device.
 *
 * `useSyncExternalStore` rather than state-plus-effect because localStorage is
 * exactly what it is for: the server has no such thing, so `getServerSnapshot`
 * returns the comfortable default and React reconciles to the stored value
 * after hydration — no state written from an effect, and no layout flash
 * written into the markup.
 *
 * Falls back to memory when the browser refuses storage (private mode, blocked
 * site data): the toggle still works for the session, it just isn't remembered.
 */
const listeners = new Set<() => void>();
let memory: boolean | null = null;

function read(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) return stored === "compact";
  } catch {
    // Fall through to the in-memory value.
  }
  return memory ?? false;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing the preference keeps this one in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAgendaDensity(): { compact: boolean; toggle: () => void } {
  const compact = useSyncExternalStore(subscribe, read, () => false);

  const toggle = useCallback(() => {
    const next = !read();
    memory = next;
    try {
      localStorage.setItem(KEY, next ? "compact" : "comfortable");
    } catch {
      // Not worth failing the toggle over; it just won't outlive the tab.
    }
    for (const listener of listeners) listener();
  }, []);

  return { compact, toggle };
}
