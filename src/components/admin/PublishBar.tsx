"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, Check, AlertTriangle } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";

type PublishState = {
  pendingSince: string | null;
  pendingCount: number;
  pendingChanges: string[];
  lastPublishedAt: string | null;
  lastPublishOk: boolean | null;
};

/**
 * Shows whether the live site is behind the data, and publishes on demand.
 *
 * Sits in the admin layout so it's visible from every section: the whole point
 * is that you can make several edits and publish once, which only works if the
 * reminder follows you around.
 */
export function PublishBar() {
  const [state, setState] = useState<PublishState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      adminFetch("/api/admin/publish")
        .then(async (r) => (r.ok ? await r.json() : null))
        .then((j) => {
          if (j?.ok) setState(j.state);
        })
        .catch(() => {
          /* the banner is informational; a failed poll shouldn't shout */
        }),
    [],
  );

  useEffect(() => {
    refresh();
    // Another organizer may be editing at the same time.
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Edits elsewhere in the panel announce themselves rather than each screen
  // knowing about this component.
  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener("devfest:content-changed", onChanged);
    return () => window.removeEventListener("devfest:content-changed", onChanged);
  }, [refresh]);

  async function publish() {
    setBusy(true);
    setMessage(null);
    const res = await adminFetch("/api/admin/publish", { method: "POST" });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !json?.ok) {
      setMessage(
        json?.reason === "no-token"
          ? "Pubblicazione non configurata (manca GITHUB_REBUILD_TOKEN)."
          : "Pubblicazione non riuscita. Le modifiche restano in attesa.",
      );
      return;
    }
    setState(json.state);
    setMessage("Pubblicazione avviata: il sito sarà aggiornato tra circa 2-3 minuti.");
  }

  const pending = (state?.pendingCount ?? 0) > 0;

  if (!state) return null;

  return (
    <div
      className={
        pending
          ? "mb-6 rounded-2xl border border-gdg-yellow/50 bg-gdg-yellow/10 px-4 py-3"
          : "mb-6 rounded-2xl border border-border px-4 py-3"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-sm">
          {pending ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gdg-yellow" />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0 text-gdg-green" />
          )}
          <div>
            {pending ? (
              <>
                <p className="font-medium">
                  {state.pendingCount} modifica{state.pendingCount === 1 ? "" : "che"} non
                  ancora pubblicata{state.pendingCount === 1 ? "" : "e"}.
                </p>
                <p className="text-muted-foreground">
                  Il sito pubblico non le mostra finché non pubblichi.
                  {state.pendingChanges.length > 0 && (
                    <> Ultime: {state.pendingChanges.slice(0, 3).join(", ")}.</>
                  )}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Il sito pubblico è aggiornato
                {state.lastPublishedAt && (
                  <>
                    {" "}
                    (ultima pubblicazione:{" "}
                    {new Date(state.lastPublishedAt).toLocaleString("it-IT", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </>
                )}
                .
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => void publish()}
          disabled={busy || !pending}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-gdg-blue-solid px-4 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
        >
          <CloudUpload className="size-4" />
          {busy ? "Avvio…" : "Pubblica sito"}
        </button>
      </div>

      {message && (
        <p className="mt-2 text-sm" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Called by admin screens after a successful write, so the banner updates
 * without every screen having to know it exists.
 */
export function notifyContentChanged() {
  window.dispatchEvent(new Event("devfest:content-changed"));
}
