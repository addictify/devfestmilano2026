"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

/**
 * Loads a slice of admin data from the API.
 *
 * The admin panel ships as part of the static export, so nothing can be
 * rendered server-side: pages that used to read Firestore during the render
 * would freeze whatever was true at build time. Everything comes through the
 * verifyAdmin-guarded API instead, which also means router.refresh() is no
 * longer a way to reload — `reload` is.
 */
export function useAdminData<T>(
  path: string,
  pick: (json: Record<string, unknown>) => T,
  fallback: T,
) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callers pass `pick` inline, so it is a new function every render. As a
  // dependency it made a new fetch → setData → render → new pick → fetch…
  // ~20 requests a second for as long as an admin page stayed open. Read it
  // through a ref instead: the fetch depends on the path alone.
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });

  const fetchOnce = useCallback(async () => {
    const res = await adminFetch(path);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(
        json?.reason === "unconfigured"
          ? "Backend non configurato."
          : `Caricamento non riuscito (${res.status}).`,
      );
    }
    return pickRef.current(json);
  }, [path]);

  // setState only from callbacks, never straight from the effect body.
  const reload = useCallback(
    () =>
      fetchOnce()
        .then((value) => {
          setData(value);
          setError(null);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false)),
    [fetchOnce],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
