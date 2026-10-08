"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Area, Field } from "./AnnouncementFields";

export type AdminAnnouncement = {
  id: string;
  titleIt: string;
  bodyIt: string;
  titleEn: string | null;
  bodyEn: string | null;
  sentAt: string | null;
  sentBy: string | null;
  sent: number | null;
  failed: number | null;
  editedAt: string | null;
};

type Draft = { titleIt: string; bodyIt: string; titleEn: string; bodyEn: string };

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome",
      }).format(new Date(iso))
    : "in invio…";

/**
 * Announcements already sent: fix a typo, or remove some (one or a
 * selection). Both act on what the site shows — the notifications page and
 * the header bell. A push already delivered can't be recalled or rewritten,
 * and the copy here says so rather than letting an edit look like a recall.
 */
export function AnnouncementsAdmin({
  data: items,
  loading,
  error,
  reload,
}: {
  data: AdminAnnouncement[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Ids awaiting the second click of a delete (one row, or the selection).
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Drop selections that no longer exist (deleted, or gone after a reload).
  const live = new Set(items.map((a) => a.id));
  const chosen = [...selected].filter((id) => live.has(id));
  const allChosen = items.length > 0 && chosen.length === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(ids: string[]) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/announcements", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Eliminazione non riuscita (${json.reason ?? res.status}).`);
        return;
      }
      setMsg(ids.length === 1 ? "Notifica eliminata." : `${ids.length} notifiche eliminate.`);
      setSelected(new Set());
      await reload();
    } catch {
      setMsg("Eliminazione non riuscita: rete non raggiungibile.");
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/announcements", {
        method: "PATCH",
        body: JSON.stringify({ id: editing.id, ...editing.draft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Salvataggio non riuscito (${json.reason ?? res.status}).`);
        return;
      }
      setMsg("Modifica salvata.");
      setEditing(null);
      await reload();
    } catch {
      setMsg("Salvataggio non riuscito: rete non raggiungibile.");
    } finally {
      setBusy(false);
    }
  }

  const setDraft = (patch: Partial<Draft>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-border pt-8">
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">Notifiche inviate</h3>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Quelle che il pubblico vede nella pagina Notifiche e nella campanella.
          Modificare o eliminare cambia solo il sito: le notifiche già arrivate
          sui telefoni restano come sono state inviate.
        </p>
      </div>

      {error && <p className="text-sm text-gdg-red">{error}</p>}
      {loading && items.length === 0 && <p className="text-sm text-muted-foreground">Caricamento…</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessuna notifica inviata.</p>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allChosen}
              ref={(el) => {
                if (el) el.indeterminate = chosen.length > 0 && !allChosen;
              }}
              onChange={() => setSelected(allChosen ? new Set() : new Set(items.map((a) => a.id)))}
            />
            Seleziona tutte
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={chosen.length === 0 || busy}
            onClick={() => setConfirmDelete(chosen)}
          >
            <Trash2 className="size-4" />
            Elimina selezionate{chosen.length > 0 ? ` (${chosen.length})` : ""}
          </Button>
        </div>
      )}

      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gdg-red/40 bg-gdg-red/10 px-4 py-3">
          <span className="text-sm font-medium">
            {confirmDelete.length === 1
              ? "Eliminare questa notifica?"
              : `Eliminare ${confirmDelete.length} notifiche?`}{" "}
            Spariscono da sito e campanella. Non è annullabile.
          </span>
          <Button size="sm" onClick={() => void remove(confirmDelete)} disabled={busy}>
            {busy ? "Elimino…" : "Conferma ed elimina"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)} disabled={busy}>
            Annulla
          </Button>
        </div>
      )}

      {msg && <p className="text-sm">{msg}</p>}

      <ul className="flex flex-col gap-3">
        {items.map((a) => {
          const isEditing = editing?.id === a.id;
          return (
            <li key={a.id} className="flex min-w-0 gap-3 rounded-2xl border border-border bg-card px-4 py-4">
              <input
                type="checkbox"
                aria-label={`Seleziona "${a.titleIt}"`}
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                className="mt-1 shrink-0 self-start"
              />
              {isEditing ? (
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Titolo (IT)" value={editing.draft.titleIt} onChange={(v) => setDraft({ titleIt: v })} max={80} />
                    <Field label="Titolo (EN)" value={editing.draft.titleEn} onChange={(v) => setDraft({ titleEn: v })} max={80} />
                    <Area label="Testo (IT)" value={editing.draft.bodyIt} onChange={(v) => setDraft({ bodyIt: v })} max={180} />
                    <Area label="Testo (EN)" value={editing.draft.bodyEn} onChange={(v) => setDraft({ bodyEn: v })} max={180} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void save()}
                      disabled={busy || !editing.draft.titleIt.trim() || !editing.draft.bodyIt.trim()}
                    >
                      {busy ? "Salvo…" : "Salva"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="font-semibold wrap-anywhere">{a.titleIt}</p>
                  <p className="mt-1 text-sm text-foreground/80 wrap-anywhere">{a.bodyIt}</p>
                  {(a.titleEn || a.bodyEn) && (
                    <p className="mt-1 text-sm text-muted-foreground wrap-anywhere">
                      EN: {a.titleEn} — {a.bodyEn}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {when(a.sentAt)}
                    {a.sentBy && ` · ${a.sentBy}`}
                    {a.sent !== null && ` · consegnata a ${a.sent}`}
                    {a.failed ? `, ${a.failed} fallite` : ""}
                    {a.editedAt && ` · modificata ${when(a.editedAt)}`}
                  </p>
                </div>
              )}
              {!isEditing && (
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
                        draft: { titleIt: a.titleIt, bodyIt: a.bodyIt, titleEn: a.titleEn ?? "", bodyEn: a.bodyEn ?? "" },
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Elimina"
                    title="Elimina"
                    disabled={busy}
                    onClick={() => setConfirmDelete([a.id])}
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
