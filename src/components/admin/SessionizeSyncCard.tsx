"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { useAdminData } from "@/hooks/useAdminData";
import { notifyContentChanged } from "./PublishBar";
import { Button } from "@/components/ui/button";

const pickLastSync = (j: Record<string, unknown>) => (j.lastSync as string | null) ?? null;

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("it-IT", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome",
      }).format(new Date(iso))
    : "mai";

type SyncResponse = {
  ok?: boolean;
  reason?: string;
  changed?: boolean;
  counts?: { speakers: number; sessions: number; tracks: number };
  removed?: { speakers: number; sessions: number; tracks: number };
};

/**
 * Pull Sessionize now rather than wait for the hourly job — for an agenda
 * change on the day. When something actually changed the site rebuilds on its
 * own (about two minutes), exactly as after the scheduled sync.
 */
export function SessionizeSyncCard() {
  const { data: lastSync, reload } = useAdminData("/api/admin/sync", pickLastSync, null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/sync", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as SyncResponse;
      if (!res.ok || !json.ok) {
        setMsg(`Sincronizzazione non riuscita: ${json.reason ?? res.status}`);
        return;
      }
      const c = json.counts;
      const totals = c ? ` (${c.sessions} sessioni, ${c.speakers} speaker, ${c.tracks} track)` : "";
      const gone = json.removed ? json.removed.sessions + json.removed.speakers + json.removed.tracks : 0;
      setMsg(
        json.changed
          ? `Trovate novità${totals}${gone ? `, ${gone} elementi rimossi` : ""}. Il sito si sta ricostruendo: online in circa 2 minuti.`
          : `Nessuna novità su Sessionize${totals}: il sito è già aggiornato.`,
      );
      // Refresh the publish banner: a failed auto-rebuild falls back to it.
      notifyContentChanged();
      void reload();
    } catch {
      setMsg("Sincronizzazione non riuscita: rete non raggiungibile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card px-5 py-5">
      <h3 className="font-display text-lg font-semibold tracking-tight">Sessionize</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Agenda e speaker arrivano da Sessionize ogni ora da soli. Dopo una modifica
        su Sessionize puoi forzare l&apos;aggiornamento subito. Ultima
        sincronizzazione: <span className="font-medium text-foreground">{when(lastSync)}</span>.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Se una modifica non compare, Sessionize potrebbe servire ancora i dati in
        cache: svuota la cache dalle impostazioni API di Sessionize e riprova.
      </p>
      <Button className="mt-4" onClick={() => void sync()} disabled={busy}>
        <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
        {busy ? "Sincronizzo…" : "Sincronizza ora"}
      </Button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </section>
  );
}
