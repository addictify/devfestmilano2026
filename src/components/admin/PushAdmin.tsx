"use client";

import { useState } from "react";
import { CalendarClock, Send } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { AnnouncementsAdmin, type AdminAnnouncement } from "./AnnouncementsAdmin";
import { Area, Field } from "./AnnouncementFields";
import { ScheduledAdmin, romeLabel, type AdminScheduled } from "./ScheduledAdmin";
import { isoToRomeInput, romeInputToIso } from "@/lib/time";
import type { ScheduleTemplate } from "@/lib/push/schedule";

type Reach = { configured: boolean; total: number; signedIn: number };

const pickAnnouncements = (j: Record<string, unknown>) => (j.announcements as AdminAnnouncement[]) ?? [];
/** Outside the component: only ever called from event handlers. */
const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

const pickScheduled = (j: Record<string, unknown>) => ({
  scheduled: (j.scheduled as AdminScheduled[]) ?? [],
  templates: (j.templates as ScheduleTemplate[]) ?? [],
});

/**
 * Send a push announcement to everyone at the event — now, or at a set time.
 *
 * Presets timed from the agenda (evening reminder, welcome, breaks, lunch,
 * goodbye) fill the form; every field stays editable before it's committed.
 *
 * "Send now" is two-step on purpose. This is the one admin action with no undo: the moment
 * the push service accepts it, it is on its way to a lock screen, and a typo
 * reaches every phone in the building. So the button arms a confirmation that
 * states the device count, and only the second click sends.
 */
export function PushAdmin() {
  const { data: reach, loading } = useAdminData<Reach | null>(
    "/api/admin/push",
    (j) => ({
      configured: Boolean(j.configured),
      total: Number(j.total ?? 0),
      signedIn: Number(j.signedIn ?? 0),
    }),
    null,
  );

  const sentList = useAdminData<AdminAnnouncement[]>("/api/admin/announcements", pickAnnouncements, []);
  const schedule = useAdminData("/api/admin/scheduled", pickScheduled, { scheduled: [], templates: [] });

  const [titleIt, setTitleIt] = useState("");
  const [bodyIt, setBodyIt] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ready = titleIt.trim().length > 0 && bodyIt.trim().length > 0;

  function clearForm() {
    setTitleIt("");
    setBodyIt("");
    setTitleEn("");
    setBodyEn("");
  }

  function applyTemplate(t: ScheduleTemplate | null) {
    setMsg(null);
    setConfirming(false);
    if (!t) {
      clearForm();
      return;
    }
    setTitleIt(t.titleIt);
    setBodyIt(t.bodyIt);
    setTitleEn(t.titleEn);
    setBodyEn(t.bodyEn);
    // A preset whose time has passed (e.g. testing after the fact) fills the
    // copy but leaves the time for the organizer to pick.
    const future = isFuture(t.sendAt);
    setMode("later");
    setWhen(future ? isoToRomeInput(t.sendAt) : "");
  }

  async function scheduleIt() {
    const sendAt = romeInputToIso(when);
    if (!sendAt || !isFuture(sendAt)) {
      setMsg("Scegli una data e un'ora future.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/scheduled", {
        method: "POST",
        body: JSON.stringify({ titleIt, bodyIt, titleEn, bodyEn, sendAt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Programmazione non riuscita: ${json.reason ?? res.status}`);
        return;
      }
      setMsg(`Programmata per ${romeLabel(sendAt)}.`);
      clearForm();
      setWhen("");
      void schedule.reload();
    } catch {
      setMsg("Programmazione non riuscita: rete non raggiungibile.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/push", {
        method: "POST",
        body: JSON.stringify({ titleIt, bodyIt, titleEn, bodyEn }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(`Invio fallito: ${json.reason ?? res.status}`);
        return;
      }
      setMsg(
        `Inviata: ${json.sent} riuscite, ${json.failed} fallite, ${json.gone} iscrizioni scadute rimosse.`,
      );
      void sentList.reload();
      clearForm();
    } catch {
      setMsg("Invio fallito: rete non raggiungibile.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader title="Notifiche push">
        Invia una comunicazione a tutti i dispositivi iscritti — cambi di sala,
        ritardi, annunci — subito oppure a un orario programmato. Una volta
        arrivata sul telefono non si può annullare.
      </AdminSectionHeader>

      {!loading && reach && !reach.configured && (
        <p className="rounded-xl border border-gdg-red/40 bg-gdg-red/10 px-4 py-3 text-sm">
          Push non configurato: mancano le chiavi VAPID sul server.
        </p>
      )}

      {reach && (
        <p className="text-sm text-muted-foreground">
          {reach.total} dispositivi iscritti, di cui {reach.signedIn} collegati a
          un account (solo questi ricevono i promemoria dei talk salvati).
        </p>
      )}

      {schedule.data.templates.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Modelli (orari presi dall&apos;agenda)</span>
          <div className="flex flex-wrap gap-2">
            {schedule.data.templates.map((t) => (
              <Button key={`${t.kind}-${t.sendAt}`} size="sm" variant="outline" onClick={() => applyTemplate(t)}>
                {t.label}
                <span className="font-mono text-xs text-muted-foreground">{romeLabel(t.sendAt)}</span>
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => applyTemplate(null)}>
              Personalizzata
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titolo (IT)" value={titleIt} onChange={setTitleIt} max={80} />
        <Field label="Titolo (EN)" value={titleEn} onChange={setTitleEn} max={80} />
        <Area label="Testo (IT)" value={bodyIt} onChange={setBodyIt} max={180} />
        <Area label="Testo (EN)" value={bodyEn} onChange={setBodyEn} max={180} />
      </div>
      <p className="text-xs text-muted-foreground">
        Senza testo inglese, a chi usa il sito in inglese arriva comunque quello
        italiano: meglio una notifica nella lingua sbagliata che una sala non
        avvisata.
      </p>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="push-when" checked={mode === "now"} onChange={() => setMode("now")} />
          Invia subito
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="push-when" checked={mode === "later"} onChange={() => { setMode("later"); setConfirming(false); }} />
          Programma
        </label>
        {mode === "later" && (
          <label className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">alle (ora di Milano)</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-gdg-blue"
            />
          </label>
        )}
      </div>

      {mode === "later" ? (
        <Button
          className="w-fit"
          onClick={() => void scheduleIt()}
          disabled={!ready || busy || !when || !reach?.configured}
        >
          <CalendarClock className="size-4" />
          {busy ? "Programmo…" : "Programma notifica"}
        </Button>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gdg-yellow bg-gdg-yellow/10 px-4 py-3">
          <span className="text-sm font-medium">
            Invio a {reach?.total ?? 0} dispositivi. Non è annullabile.
          </span>
          <Button size="sm" onClick={send} disabled={busy}>
            {busy ? "Invio…" : "Conferma e invia"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
            Annulla
          </Button>
        </div>
      ) : (
        <Button
          className="w-fit"
          onClick={() => setConfirming(true)}
          disabled={!ready || busy || !reach?.configured}
        >
          <Send className="size-4" />
          Invia notifica
        </Button>
      )}

      {msg && <p className="text-sm">{msg}</p>}

      <ScheduledAdmin items={schedule.data.scheduled} reload={schedule.reload} />
      <AnnouncementsAdmin {...sentList} />
    </section>
  );
}
