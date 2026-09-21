"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { Button } from "@/components/ui/button";

type Reach = { configured: boolean; total: number; signedIn: number };

/**
 * Send a push announcement to everyone at the event.
 *
 * Two-step on purpose. This is the one admin action with no undo: the moment
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

  const [titleIt, setTitleIt] = useState("");
  const [bodyIt, setBodyIt] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ready = titleIt.trim().length > 0 && bodyIt.trim().length > 0;

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
      setTitleIt("");
      setBodyIt("");
      setTitleEn("");
      setBodyEn("");
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
        ritardi, annunci. Arriva subito sul telefono e non si può annullare.
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

      {confirming ? (
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
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </span>
      <input
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gdg-blue"
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </span>
      <textarea
        value={value}
        maxLength={max}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gdg-blue"
      />
    </label>
  );
}
