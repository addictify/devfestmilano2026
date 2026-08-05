"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import type { SiteSettings } from "@/lib/data/settings";

const LABELS: Record<keyof SiteSettings, string> = {
  ticketsAvailable: "Biglietti in vendita",
  speakersPublished: "Speaker pubblicati",
  schedulePublished: "Agenda pubblicata",
  cfpOpen: "Call for Speakers aperta",
};

export function ConfigAdmin({ initial }: { initial: SiteSettings }) {
  const [flags, setFlags] = useState<SiteSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/config", { method: "POST", body: JSON.stringify(flags) });
      setMsg(res.ok ? "Salvato. Le pagine pubbliche sono state rigenerate." : `Errore (${res.status}).`);
    } catch {
      setMsg("Errore di rete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 font-display text-xl font-bold">Configurazione</h2>
      <div className="flex flex-col gap-3">
        {(Object.keys(LABELS) as (keyof SiteSettings)[]).map((k) => (
          <label key={k} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <span>{LABELS[k]}</span>
            <input
              type="checkbox"
              aria-label={LABELS[k]}
              checked={flags[k]}
              onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })}
            />
          </label>
        ))}
      </div>
      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
      <Button className="mt-4" onClick={save} disabled={busy}>Salva</Button>
    </div>
  );
}
