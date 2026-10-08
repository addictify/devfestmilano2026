"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { isoToRomeInput, romeInputToIso } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Area, Field } from "./AnnouncementFields";

export type AdminScheduled = {
  id: string;
  titleIt: string;
  bodyIt: string;
  titleEn: string | null;
  bodyEn: string | null;
  sendAt: string | null;
  status: "pending" | "sending" | "failed" | "missed";
  createdBy: string | null;
  error: string | null;
};

type Draft = { titleIt: string; bodyIt: string; titleEn: string; bodyEn: string; when: string };

const STATUS: Record<AdminScheduled["status"], { label: string; className: string }> = {
  pending: { label: "In attesa", className: "bg-gdg-blue/10 text-gdg-blue" },
  sending: { label: "In invio", className: "bg-gdg-yellow/20 text-foreground" },
  failed: { label: "Non riuscita", className: "bg-gdg-red/10 text-gdg-red" },
  missed: { label: "Saltata: troppo in ritardo", className: "bg-gdg-red/10 text-gdg-red" },
};

export const romeLabel = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome",
      }).format(new Date(iso))
    : "—";

/**
 * Announcements waiting for their time. Editing re-arms a failed or missed
 * one; deleting cancels it. Nothing here has reached a phone yet — once sent,
 * an item moves to "Notifiche inviate" below.
 */
export function ScheduledAdmin({
  items,
  reload,
}: {
  items: AdminScheduled[];
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body: unknown, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/scheduled", { method, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(
          json.reason === "locked"
            ? "È già in invio: non si può più modificare."
            : json.reason === "invalid"
              ? "Controlla i campi: serve testo italiano e un orario futuro."
              : `Operazione non riuscita (${json.reason ?? res.status}).`,
        );
        return false;
      }
      setMsg(ok);
      await reload();
      return true;
    } catch {
      setMsg("Operazione non riuscita: rete non raggiungibile.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing) return;
    const { when, ...copy } = editing.draft;
    const sendAt = romeInputToIso(when);
    if (!sendAt) return setMsg("Orario non valido.");
    if (await call("PATCH", { id: editing.id, ...copy, sendAt }, "Modifica salvata.")) setEditing(null);
  }

  const setDraft = (patch: Partial<Draft>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-border pt-8">
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">Notifiche programmate</h3>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Partono da sole entro 5 minuti dall&apos;orario scelto (ora di Milano), dall&apos;8
          all&apos;11 ottobre. Se per qualche motivo partissero più di 30 minuti in ritardo
          vengono saltate, per non mandare un &quot;è pronto il pranzo&quot; a pranzo finito.
        </p>
      </div>

      {items.length === 0 && <p className="text-sm text-muted-foreground">Nessuna notifica programmata.</p>}
      {msg && <p className="text-sm">{msg}</p>}

      <ul className="flex flex-col gap-3">
        {items.map((a) => {
          const isEditing = editing?.id === a.id;
          const status = STATUS[a.status] ?? STATUS.pending;
          return (
            <li key={a.id} className="flex min-w-0 gap-3 rounded-2xl border border-border bg-card px-4 py-4">
              {isEditing ? (
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <label className="flex w-fit flex-col gap-1 text-sm">
                    <span className="font-medium">Data e ora (Milano)</span>
                    <input
                      type="datetime-local"
                      value={editing.draft.when}
                      onChange={(e) => setDraft({ when: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gdg-blue"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Titolo (IT)" value={editing.draft.titleIt} onChange={(v) => setDraft({ titleIt: v })} max={80} />
                    <Field label="Titolo (EN)" value={editing.draft.titleEn} onChange={(v) => setDraft({ titleEn: v })} max={80} />
                    <Area label="Testo (IT)" value={editing.draft.bodyIt} onChange={(v) => setDraft({ bodyIt: v })} max={180} />
                    <Area label="Testo (EN)" value={editing.draft.bodyEn} onChange={(v) => setDraft({ bodyEn: v })} max={180} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void save()} disabled={busy}>
                      {busy ? "Salvo…" : "Salva"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{romeLabel(a.sendAt)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold wrap-anywhere">{a.titleIt}</p>
                  <p className="mt-1 text-sm text-foreground/80 wrap-anywhere">{a.bodyIt}</p>
                  {(a.titleEn || a.bodyEn) && (
                    <p className="mt-1 text-sm text-muted-foreground wrap-anywhere">
                      EN: {a.titleEn} — {a.bodyEn}
                    </p>
                  )}
                  {a.error && <p className="mt-1 font-mono text-xs text-gdg-red wrap-anywhere">{a.error}</p>}
                  {confirmDelete === a.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Annullare questa notifica?</span>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void call("DELETE", { ids: [a.id] }, "Notifica annullata.").then(() => setConfirmDelete(null))}
                      >
                        Conferma
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDelete(null)}>
                        No
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!isEditing && a.status !== "sending" && (
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Modifica"
                    title="Modifica"
                    disabled={busy}
                    onClick={() =>
                      setEditing({
                        id: a.id,
                        draft: {
                          titleIt: a.titleIt,
                          bodyIt: a.bodyIt,
                          titleEn: a.titleEn ?? "",
                          bodyEn: a.bodyEn ?? "",
                          when: a.sendAt ? isoToRomeInput(a.sendAt) : "",
                        },
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Annulla notifica"
                    title="Annulla notifica"
                    disabled={busy}
                    onClick={() => setConfirmDelete(a.id)}
                  >
                    <Trash2 className="size-4 text-gdg-red" />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
